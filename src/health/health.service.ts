import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async getHealthStatus(): Promise<{
    status: string;
    timestamp: string;
    service: string;
    checks: Record<string, { status: string; message?: string }>;
  }> {
    const checks: Record<string, { status: string; message?: string }> = {
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
    };

    const allHealthy = Object.values(checks).every(
      (check) => check.status === 'healthy',
    );

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      service: 'email-service',
      checks,
    };
  }

  private async checkDatabase(): Promise<{ status: string; message?: string }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy' };
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return {
        status: 'unhealthy',
        message:
          error instanceof Error ? error.message : 'Database connection failed',
      };
    }
  }

  private async checkRedis(): Promise<{ status: string; message?: string }> {
    try {
      await this.redis.set('health:check', 'ok', 10);
      const value = await this.redis.get('health:check');

      if (value === 'ok') {
        return { status: 'healthy' };
      }

      return { status: 'unhealthy', message: 'Redis read/write test failed' };
    } catch (error) {
      this.logger.error('Redis health check failed:', error);
      return {
        status: 'unhealthy',
        message:
          error instanceof Error ? error.message : 'Redis connection failed',
      };
    }
  }
}
