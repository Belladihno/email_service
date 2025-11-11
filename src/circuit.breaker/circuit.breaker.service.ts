import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { CircuitBreakerConfig, CircuitBreakerStateEnum } from '../types';

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private config: CircuitBreakerConfig;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.config =
      this.configService.get<CircuitBreakerConfig>('circuitBreaker')!;
  }

  async executeWithCircuitBreaker<T>(
    serviceName: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    const state = await this.getState(serviceName);

    if (state === CircuitBreakerStateEnum.OPEN) {
      const shouldAttemptReset = await this.shouldAttemptReset(serviceName);

      if (!shouldAttemptReset) {
        this.logger.warn(`Circuit breaker is OPEN for ${serviceName}`);
        throw new Error(`Circuit breaker is open for ${serviceName}`);
      }

      await this.transitionToHalfOpen(serviceName);
    }

    try {
      const result = await operation();
      await this.onSuccess(serviceName);
      return result;
    } catch (error) {
      await this.onFailure(serviceName);
      throw error;
    }
  }

  private async getState(
    serviceName: string,
  ): Promise<CircuitBreakerStateEnum> {
    const record = await this.prisma.circuit_Breaker_State.findUnique({
      where: { service_name: serviceName },
    });

    if (!record) {
      await this.prisma.circuit_Breaker_State.create({
        data: {
          service_name: serviceName,
          state: CircuitBreakerStateEnum.CLOSED,
          failure_count: 0,
        },
      });
      return CircuitBreakerStateEnum.CLOSED;
    }

    return record.state as CircuitBreakerStateEnum;
  }

  private async shouldAttemptReset(serviceName: string): Promise<boolean> {
    const record = await this.prisma.circuit_Breaker_State.findUnique({
      where: { service_name: serviceName },
    });

    if (!record?.opened_at) return false;

    const timeSinceOpen = Date.now() - new Date(record.opened_at).getTime();
    return timeSinceOpen >= this.config.resetTimeout;
  }

  private async transitionToHalfOpen(serviceName: string): Promise<void> {
    await this.prisma.circuit_Breaker_State.update({
      where: { service_name: serviceName },
      data: {
        state: CircuitBreakerStateEnum.HALF_OPEN,
      },
    });
    this.logger.log(
      `Circuit breaker transitioned to HALF_OPEN for ${serviceName}`,
    );
  }

  private async onSuccess(serviceName: string): Promise<void> {
    const record = await this.prisma.circuit_Breaker_State.findUnique({
      where: { service_name: serviceName },
    });

    if (record?.state === CircuitBreakerStateEnum.HALF_OPEN) {
      await this.prisma.circuit_Breaker_State.update({
        where: { service_name: serviceName },
        data: {
          state: CircuitBreakerStateEnum.CLOSED,
          failure_count: 0,
          last_failure_time: null,
          opened_at: null,
        },
      });
      this.logger.log(`Circuit breaker CLOSED for ${serviceName}`);
    } else {
      await this.prisma.circuit_Breaker_State.update({
        where: { service_name: serviceName },
        data: {
          failure_count: 0,
        },
      });
    }
  }

  private async onFailure(serviceName: string): Promise<void> {
    const record = await this.prisma.circuit_Breaker_State.findUnique({
      where: { service_name: serviceName },
    });

    if (!record) return;

    const newFailureCount = record.failure_count + 1;

    if (newFailureCount >= this.config.threshold) {
      await this.prisma.circuit_Breaker_State.update({
        where: { service_name: serviceName },
        data: {
          state: CircuitBreakerStateEnum.OPEN,
          failure_count: newFailureCount,
          last_failure_time: new Date(),
          opened_at: new Date(),
        },
      });
      this.logger.error(
        `Circuit breaker OPENED for ${serviceName} after ${newFailureCount} failures`,
      );
    } else {
      await this.prisma.circuit_Breaker_State.update({
        where: { service_name: serviceName },
        data: {
          failure_count: newFailureCount,
          last_failure_time: new Date(),
        },
      });
    }
  }
}
