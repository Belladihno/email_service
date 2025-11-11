import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { StatusUpdatePayload, NotificationStatus } from '../types';

@Injectable()
export class ApiGatewayClient {
  private readonly logger = new Logger(ApiGatewayClient.name);
  private readonly baseUrl: string;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.baseUrl = this.configService.get<string>('services.apiGatewayUrl')!;
  }

  async updateNotificationStatus(
    payload: StatusUpdatePayload,
    correlationId: string,
  ): Promise<void> {
    try {
      this.logger.log(
        `[${correlationId}] Updating notification status to ${payload.status} for ${payload.notification_id}`,
      );

      await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/api/v1/email/status`,
          {
            notification_id: payload.notification_id,
            status: payload.status,
            timestamp: payload.timestamp || new Date().toISOString(),
            error: payload.error,
          },
          {
            headers: {
              'X-Correlation-ID': correlationId,
              'Content-Type': 'application/json',
            },
            timeout: 5000,
          },
        ),
      );

      this.logger.log(`[${correlationId}] Status update sent successfully`);
    } catch (error) {
      this.logger.error(
        `[${correlationId}] Failed to update notification status:`,
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  async notifyDelivered(
    notificationId: string,
    correlationId: string,
  ): Promise<void> {
    await this.updateNotificationStatus(
      {
        notification_id: notificationId,
        status: NotificationStatus.DELIVERED,
        timestamp: new Date().toISOString(),
      },
      correlationId,
    );
  }

  async notifyFailed(
    notificationId: string,
    error: string,
    correlationId: string,
  ): Promise<void> {
    await this.updateNotificationStatus(
      {
        notification_id: notificationId,
        status: NotificationStatus.FAILED,
        timestamp: new Date().toISOString(),
        error,
      },
      correlationId,
    );
  }
}
