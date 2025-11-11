import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthCheckDto } from 'src/dto/health.response.dto';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary: 'Health check endpoint',
    description: 'Returns the health status of the email service',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    type: HealthCheckDto,
  })
  @ApiResponse({
    status: 503,
    description: 'Service is degraded or unhealthy',
  })
  async checkHealth(): Promise<HealthCheckDto> {
    return this.healthService.getHealthStatus();
  }
}
