import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { NotificationStatus } from '../types';
import {
  MetricsResponseDto,
  MessageMetricsDto,
  QueueMetricsDto,
  CircuitBreakerMetricsDto,
  RetryMetricsDto,
  PerformanceMetricsDto,
  CacheMetricsDto,
} from '../dto/metrics.dto';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async getMetrics(): Promise<MetricsResponseDto> {
    const [messages, queues, circuitBreakers, retries, performance, cache] =
      await Promise.all([
        this.getMessageMetrics(),
        this.getQueueMetrics(),
        this.getCircuitBreakerMetrics(),
        this.getRetryMetrics(),
        this.getPerformanceMetrics(),
        this.getCacheMetrics(),
      ]);

    return {
      timestamp: new Date().toISOString(),
      service: 'email-service',
      messages,
      queues,
      circuit_breakers: circuitBreakers,
      retries,
      performance,
      cache,
    };
  }

  private async getMessageMetrics(): Promise<MessageMetricsDto> {
    const [totalProcessed, delivered, failed, pending] = await Promise.all([
      this.prisma.email_Log.count(),
      this.prisma.email_Log.count({
        where: { status: NotificationStatus.DELIVERED },
      }),
      this.prisma.email_Log.count({
        where: { status: NotificationStatus.FAILED },
      }),
      this.prisma.email_Log.count({
        where: { status: NotificationStatus.PENDING },
      }),
    ]);

    const successRate =
      totalProcessed > 0 ? (delivered / totalProcessed) * 100 : 0;

    return {
      total_processed: totalProcessed,
      delivered,
      failed,
      pending,
      success_rate: Number(successRate.toFixed(2)),
    };
  }

  private async getQueueMetrics(): Promise<QueueMetricsDto> {
    const emailQueueLength = await this.getQueueLengthFromRedis('email');
    const failedQueueLength = await this.getQueueLengthFromRedis('failed');

    return {
      email_queue_length: emailQueueLength,
      failed_queue_length: failedQueueLength,
    };
  }

  private async getQueueLengthFromRedis(queueType: string): Promise<number> {
    try {
      const key = `queue:length:${queueType}`;
      const value = await this.redis.get(key);
      return value ? parseInt(value, 10) : 0;
    } catch (error) {
      this.logger.error(`Error getting queue length for ${queueType}:`, error);
      return 0;
    }
  }

  private async getCircuitBreakerMetrics(): Promise<CircuitBreakerMetricsDto> {
    const [sendgrid, templateService] = await Promise.all([
      this.getCircuitBreakerState('sendgrid'),
      this.getCircuitBreakerState('template-service'),
    ]);

    return {
      sendgrid,
      user_service: 'n/a',
      template_service: templateService,
    };
  }

  private async getCircuitBreakerState(serviceName: string): Promise<string> {
    try {
      const record = await this.prisma.circuit_Breaker_State.findUnique({
        where: { service_name: serviceName },
      });

      return record?.state || 'closed';
    } catch (error) {
      this.logger.error(
        `Error getting circuit breaker state for ${serviceName}:`,
        error,
      );
      return 'unknown';
    }
  }

  private async getRetryMetrics(): Promise<RetryMetricsDto> {
    const emailLogs = await this.prisma.email_Log.findMany({
      select: { retry_count: true },
    });

    const totalRetries = emailLogs.reduce(
      (sum, log) => sum + log.retry_count,
      0,
    );

    const avgRetryCount =
      emailLogs.length > 0 ? totalRetries / emailLogs.length : 0;

    const maxRetriesReached = emailLogs.filter(
      (log) => log.retry_count >= 5,
    ).length;

    return {
      total_retries: totalRetries,
      avg_retry_count: Number(avgRetryCount.toFixed(2)),
      max_retries_reached: maxRetriesReached,
    };
  }

  private async getPerformanceMetrics(): Promise<PerformanceMetricsDto> {
    const oneMinuteAgo = new Date(Date.now() - 60000);

    const [recentEmails, avgProcessingTime] = await Promise.all([
      this.prisma.email_Log.count({
        where: {
          created_at: { gte: oneMinuteAgo },
        },
      }),
      this.calculateAvgProcessingTime(),
    ]);

    return {
      avg_processing_time_ms: avgProcessingTime,
      messages_per_minute: recentEmails,
    };
  }

  private async calculateAvgProcessingTime(): Promise<number> {
    const recentDelivered = await this.prisma.email_Log.findMany({
      where: {
        status: NotificationStatus.DELIVERED,
        sent_at: { not: null },
      },
      select: {
        created_at: true,
        sent_at: true,
      },
      take: 100,
      orderBy: { created_at: 'desc' },
    });

    if (recentDelivered.length === 0) {
      return 0;
    }

    const totalTime = recentDelivered.reduce((sum, log) => {
      if (!log.sent_at) return sum;
      const processingTime =
        new Date(log.sent_at).getTime() - new Date(log.created_at).getTime();
      return sum + processingTime;
    }, 0);

    const avgTime = totalTime / recentDelivered.length;
    return Number(avgTime.toFixed(0));
  }

  private async getCacheMetrics(): Promise<CacheMetricsDto> {
    const [userHits, userMisses, templateHits, templateMisses] =
      await Promise.all([
        this.getRedisCounter('metrics:cache:user:hits'),
        this.getRedisCounter('metrics:cache:user:misses'),
        this.getRedisCounter('metrics:cache:template:hits'),
        this.getRedisCounter('metrics:cache:template:misses'),
      ]);

    const totalHits = userHits + templateHits;
    const totalMisses = userMisses + templateMisses;
    const total = totalHits + totalMisses;
    const hitRate = total > 0 ? (totalHits / total) * 100 : 0;

    return {
      hit_rate: Number(hitRate.toFixed(2)),
      hits: totalHits,
      misses: totalMisses,
    };
  }

  private async getRedisCounter(key: string): Promise<number> {
    try {
      const value = await this.redis.get(key);
      return value ? parseInt(value, 10) : 0;
    } catch (error) {
      this.logger.error(`Error reading counter ${key}:`, error);
      return 0;
    }
  }
}
