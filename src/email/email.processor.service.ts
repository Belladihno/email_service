import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { UserClient } from '../clients/user.client';
import { TemplateClient } from '../clients/template.client';
import { ApiGatewayClient } from '../clients/api.gateway.client';
import { SendGridService } from './sendgrid.service';
import { NotificationMessage, NotificationStatus, RetryConfig } from '../types';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class EmailProcessorService {
  private readonly logger = new Logger(EmailProcessorService.name);
  private readonly retryConfig: RetryConfig;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private redis: RedisService,
    private userClient: UserClient,
    private templateClient: TemplateClient,
    private gatewayClient: ApiGatewayClient,
    private sendGridService: SendGridService,
  ) {
    this.retryConfig = this.configService.get<RetryConfig>('retry')!;
  }

  async processNotification(message: NotificationMessage): Promise<void> {
    const correlationId = message.request_id;
    this.logger.log(
      `[${correlationId}] Processing email notification for user ${message.user_id}`,
    );

    try {
      const isDuplicate = await this.checkIdempotency(message.request_id);
      if (isDuplicate) {
        this.logger.warn(
          `[${correlationId}] Duplicate request detected, skipping`,
        );
        return;
      }

      const notificationId = uuidv4();

      await this.createEmailLog(message, notificationId, correlationId);

      const user = await this.userClient.getUserById(
        message.user_id,
        correlationId,
      );

      if (!user.preferences.email) {
        this.logger.log(
          `[${correlationId}] User has disabled email notifications`,
        );
        await this.updateEmailLogStatus(
          message.request_id,
          NotificationStatus.FAILED,
          'User has disabled email notifications',
        );
        return;
      }

      const template = await this.templateClient.getTemplateByCode(
        message.template_code,
        correlationId,
      );

      const rendered = this.templateClient.renderTemplate(
        template,
        message.variables,
      );

      await this.sendGridService.sendEmail(
        {
          to: user.email,
          subject: rendered.subject,
          html: rendered.body,
        },
        correlationId,
      );

      await this.updateEmailLogStatus(
        message.request_id,
        NotificationStatus.DELIVERED,
        undefined,
        new Date(),
      );

      await this.gatewayClient.notifyDelivered(notificationId, correlationId);

      this.logger.log(
        `[${correlationId}] Email notification processed successfully`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `[${correlationId}] Failed to process email:`,
        errorMessage,
      );

      await this.handleFailure(message, errorMessage, correlationId);
    }
  }

  private async checkIdempotency(requestId: string): Promise<boolean> {
    const cacheKey = `idempotency:${requestId}`;
    const exists = await this.redis.exists(cacheKey);

    if (exists) {
      return true;
    }

    await this.redis.setWithExpiry(cacheKey, 'processed', 86400); // 24 hours
    return false;
  }

  private async createEmailLog(
    message: NotificationMessage,
    notificationId: string,
    correlationId: string,
  ): Promise<void> {
    try {
      const user = await this.userClient.getUserById(
        message.user_id,
        correlationId,
      );

      await this.prisma.email_Log.create({
        data: {
          request_id: message.request_id,
          notification_id: notificationId,
          user_id: message.user_id,
          email: user.email,
          template_code: message.template_code,
          status: NotificationStatus.PENDING,
          retry_count: 0,
        },
      });
    } catch (error) {
      this.logger.error(
        `[${correlationId}] Failed to create email log:`,
        error,
      );
    }
  }

  private async updateEmailLogStatus(
    requestId: string,
    status: NotificationStatus,
    errorMessage?: string,
    sentAt?: Date,
  ): Promise<void> {
    try {
      await this.prisma.email_Log.update({
        where: { request_id: requestId },
        data: {
          status,
          error_message: errorMessage,
          sent_at: sentAt,
        },
      });
    } catch (error) {
      this.logger.error('Failed to update email log:', error);
    }
  }

  private async handleFailure(
    message: NotificationMessage,
    errorMessage: string,
    correlationId: string,
  ): Promise<void> {
    const emailLog = await this.prisma.email_Log.findUnique({
      where: { request_id: message.request_id },
    });

    if (!emailLog) {
      this.logger.error(`[${correlationId}] Email log not found for retry`);
      return;
    }

    const retryCount = emailLog.retry_count + 1;

    if (retryCount >= this.retryConfig.maxAttempts) {
      this.logger.error(
        `[${correlationId}] Max retry attempts reached (${retryCount}), moving to failed state`,
      );

      await this.updateEmailLogStatus(
        message.request_id,
        NotificationStatus.FAILED,
        errorMessage,
      );

      if (emailLog.notification_id) {
        await this.gatewayClient.notifyFailed(
          emailLog.notification_id,
          errorMessage,
          correlationId,
        );
      }

      return;
    }

    const delay = this.calculateRetryDelay(retryCount);
    this.logger.log(
      `[${correlationId}] Scheduling retry ${retryCount}/${this.retryConfig.maxAttempts} in ${delay}ms`,
    );

    await this.prisma.email_Log.update({
      where: { request_id: message.request_id },
      data: {
        retry_count: retryCount,
        error_message: errorMessage,
      },
    });

    setTimeout(() => {
      this.processNotification(message).catch((err) => {
        this.logger.error(`[${correlationId}] Retry failed:`, err);
      });
    }, delay);
  }

  private calculateRetryDelay(retryCount: number): number {
    const delay = this.retryConfig.initialDelay * Math.pow(2, retryCount - 1);
    return Math.min(delay, this.retryConfig.maxDelay);
  }
}
