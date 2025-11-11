import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private healthService: HealthService) {}

  @Get()
  async checkHealth(): Promise<{
    status: string;
    timestamp: string;
    service: string;
    checks: Record<string, { status: string; message?: string }>;
  }> {
    return this.healthService.getHealthStatus();
  }
}
