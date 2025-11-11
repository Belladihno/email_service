import { ApiProperty } from '@nestjs/swagger';

export class HealthCheckDto {
  @ApiProperty({
    example: 'healthy',
    description: 'Overall health status',
    enum: ['healthy', 'degraded', 'unhealthy'],
  })
  status: string;

  @ApiProperty({
    example: '2025-11-11T04:15:48.000Z',
    description: 'Timestamp of health check',
  })
  timestamp: string;

  @ApiProperty({
    example: 'email-service',
    description: 'Service name',
  })
  service: string;

  @ApiProperty({
    type: 'object',
    description: 'Individual component health checks',
    additionalProperties: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        message: { type: 'string' },
      },
      required: ['status'],
    },
    example: {
      database: { status: 'healthy' },
      redis: { status: 'healthy' },
    },
  })
  checks: Record<string, { status: string; message?: string }>;
}
