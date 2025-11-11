import { ApiProperty } from '@nestjs/swagger';

export class MessageMetricsDto {
  @ApiProperty({ example: 1500, description: 'Total emails processed' })
  total_processed: number;

  @ApiProperty({ example: 1450, description: 'Successfully delivered emails' })
  delivered: number;

  @ApiProperty({ example: 50, description: 'Failed emails' })
  failed: number;

  @ApiProperty({ example: 25, description: 'Pending emails' })
  pending: number;

  @ApiProperty({ example: 96.67, description: 'Success rate percentage' })
  success_rate: number;
}

export class QueueMetricsDto {
  @ApiProperty({ example: 12, description: 'Email queue length' })
  email_queue_length: number;

  @ApiProperty({ example: 3, description: 'Failed queue length' })
  failed_queue_length: number;
}

export class CircuitBreakerMetricsDto {
  @ApiProperty({
    example: 'closed',
    description: 'SendGrid circuit breaker state',
  })
  sendgrid: string;

  @ApiProperty({
    example: 'closed',
    description: 'User service circuit breaker state',
  })
  user_service: string;

  @ApiProperty({
    example: 'closed',
    description: 'Template service circuit breaker state',
  })
  template_service: string;
}

export class RetryMetricsDto {
  @ApiProperty({ example: 75, description: 'Total retry attempts' })
  total_retries: number;

  @ApiProperty({ example: 1.5, description: 'Average retry count per message' })
  avg_retry_count: number;

  @ApiProperty({ example: 5, description: 'Messages that hit max retries' })
  max_retries_reached: number;
}

export class PerformanceMetricsDto {
  @ApiProperty({
    example: 245,
    description: 'Average email processing time in milliseconds',
  })
  avg_processing_time_ms: number;

  @ApiProperty({
    example: 1250,
    description: 'Emails processed in the last minute',
  })
  messages_per_minute: number;
}

export class CacheMetricsDto {
  @ApiProperty({ example: 85.5, description: 'Cache hit rate percentage' })
  hit_rate: number;

  @ApiProperty({ example: 150, description: 'Total cache hits' })
  hits: number;

  @ApiProperty({ example: 25, description: 'Total cache misses' })
  misses: number;
}

export class MetricsResponseDto {
  @ApiProperty({
    example: '2025-11-11T04:15:48.000Z',
    description: 'Metrics timestamp',
  })
  timestamp: string;

  @ApiProperty({ example: 'email-service', description: 'Service name' })
  service: string;

  @ApiProperty({ type: MessageMetricsDto, description: 'Message statistics' })
  messages: MessageMetricsDto;

  @ApiProperty({ type: QueueMetricsDto, description: 'Queue statistics' })
  queues: QueueMetricsDto;

  @ApiProperty({
    type: CircuitBreakerMetricsDto,
    description: 'Circuit breaker states',
  })
  circuit_breakers: CircuitBreakerMetricsDto;

  @ApiProperty({ type: RetryMetricsDto, description: 'Retry statistics' })
  retries: RetryMetricsDto;

  @ApiProperty({
    type: PerformanceMetricsDto,
    description: 'Performance statistics',
  })
  performance: PerformanceMetricsDto;

  @ApiProperty({ type: CacheMetricsDto, description: 'Cache statistics' })
  cache: CacheMetricsDto;
}
