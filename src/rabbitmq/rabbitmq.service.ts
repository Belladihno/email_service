import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
// import type { Connection, Channel } from 'amqplib';
import { EmailProcessorService } from 'src/email/email.processor.service';
import { NotificationMessage, RabbitMQConfig } from '../types';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;
  private readonly rabbitmqUrl: string;
  private readonly emailQueue: string;
  private readonly failedQueue: string;
  private readonly exchangeName: string;

  constructor(
    private configService: ConfigService,
    private emailProcessor: EmailProcessorService,
  ) {
    const rabbitConfig = this.configService.get<RabbitMQConfig>('rabbitmq');

    if (!rabbitConfig) {
      throw new Error('RabbitMQ configuration is missing');
    }

    this.rabbitmqUrl = rabbitConfig.url;
    this.emailQueue = rabbitConfig.emailQueue;
    this.failedQueue = rabbitConfig.failedQueue;
    this.exchangeName = rabbitConfig.exchangeName;
  }

  async onModuleInit() {
    try {
      await this.connect();
      await this.setupQueues();
      await this.startConsuming();
    } catch (error) {
      this.logger.error(
        'Failed to initialize RabbitMQ:',
        error instanceof Error ? error.stack : error,
      );
      // Don't throw - let the app start and retry connection in background
      setTimeout(() => void this.onModuleInit(), 5000);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }

  private async connect(): Promise<void> {
    try {
      const connection = await amqp.connect(this.rabbitmqUrl);

      if (!connection) {
        throw new Error('Failed to establish connection');
      }

      this.connection = connection;
      this.channel = await connection.createChannel();

      connection.on('error', (err) => {
        this.logger.error('RabbitMQ connection error:', err);
      });

      connection.on('close', () => {
        this.logger.warn(
          'RabbitMQ connection closed, attempting to reconnect...',
        );
        setTimeout(() => void this.connect(), 5000);
      });

      this.logger.log('Connected to RabbitMQ');
    } catch (error) {
      this.logger.error(
        'Failed to connect to RabbitMQ:',
        error instanceof Error ? error.stack : error,
      );
      setTimeout(() => void this.connect(), 5000);
    }
  }

  private async setupQueues(): Promise<void> {
    if (!this.channel) {
      throw new Error('Channel not initialized');
    }

    await this.channel.assertExchange(this.exchangeName, 'direct', {
      durable: true,
    });

    await this.channel.assertQueue(this.emailQueue, { durable: true });
    await this.channel.assertQueue(this.failedQueue, { durable: true });

    await this.channel.bindQueue(this.emailQueue, this.exchangeName, 'email');
    await this.channel.bindQueue(this.failedQueue, this.exchangeName, 'failed');

    this.logger.log('RabbitMQ queues and exchanges set up successfully');
  }

  private async startConsuming(): Promise<void> {
    if (!this.channel) {
      throw new Error('Channel not initialized');
    }

    this.logger.log(`Starting to consume messages from ${this.emailQueue}`);

    await this.channel.consume(
      this.emailQueue,
      (msg) => {
        if (!msg) return;

        this.processMessage(msg).catch((error) => {
          this.logger.error('Unhandled error in message processing:', error);
        });
      },
      { noAck: false },
    );

    this.logger.log('Email queue consumer started successfully');
  }

  private async processMessage(msg: amqp.ConsumeMessage): Promise<void> {
    try {
      const content = msg.content.toString();
      const message: NotificationMessage = JSON.parse(
        content,
      ) as NotificationMessage;

      this.logger.log(`Received message: ${message.request_id}`);

      await this.emailProcessor.processNotification(message);

      this.channel?.ack(msg);
    } catch (error) {
      this.logger.error(
        'Error processing message:',
        error instanceof Error ? error.stack : error,
      );
      this.channel?.nack(msg, false, false);
    }
  }

  publishToFailedQueue(message: NotificationMessage, error: string): void {
    if (!this.channel) {
      this.logger.error(
        'Cannot publish to failed queue: channel not initialized',
      );
      return;
    }

    try {
      const payload = {
        ...message,
        error,
        failed_at: new Date().toISOString(),
      };

      const published = this.channel.publish(
        this.exchangeName,
        'failed',
        Buffer.from(JSON.stringify(payload)),
        { persistent: true },
      );

      if (!published) {
        this.logger.warn('Failed to publish message - buffer full');
      }

      this.logger.log(`Message ${message.request_id} moved to failed queue`);
    } catch (error) {
      this.logger.error(
        'Failed to publish to failed queue:',
        error instanceof Error ? error.stack : error,
      );
    }
  }

  private async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        await this.connection.close();
      }
      this.logger.log('Disconnected from RabbitMQ');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Error disconnecting from RabbitMQ:', errorMessage);
    }
  }
}
