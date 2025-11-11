import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';
import { MetricsResponseDto } from '../dto/metrics.dto';

@ApiTags('metrics')
@Controller('api/v1/metrics')
export class MetricsController {
  constructor(private metricsService: MetricsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get service metrics',
    description:
      'Returns comprehensive metrics including message stats, queue lengths, circuit breaker states, retry statistics, and performance data',
  })
  @ApiResponse({
    status: 200,
    description: 'Metrics retrieved successfully',
    type: MetricsResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getMetrics(): Promise<MetricsResponseDto> {
    return this.metricsService.getMetrics();
  }
}
