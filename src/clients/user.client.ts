import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CircuitBreakerService } from 'src/circuit.breaker/circuit.breaker.service';
import { RedisService } from '../redis/redis.service';
import { ApiResponse, UserResponse } from '../types';

@Injectable()
export class UserClient {
  private readonly logger = new Logger(UserClient.name);
  private readonly baseUrl: string;
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
    private circuitBreaker: CircuitBreakerService,
    private redis: RedisService,
  ) {
    this.baseUrl = this.configService.get<string>('services.userServiceUrl')!;
  }

  async getUserById(
    userId: string,
    correlationId: string,
  ): Promise<UserResponse> {
    const cacheKey = `user:${userId}`;

    const cached = await this.redis.getJson<UserResponse>(cacheKey);
    if (cached) {
      this.logger.log(`[${correlationId}] User ${userId} found in cache`);
      await this.recordCacheHit();
      return cached;
    }

    await this.recordCacheMiss();

    this.logger.log(
      `[${correlationId}] Fetching user ${userId} from User Service`,
    );

    const user = await this.circuitBreaker.executeWithCircuitBreaker(
      'user-service',
      async () => {
        const response = await firstValueFrom(
          this.httpService.get<ApiResponse<UserResponse>>(
            `${this.baseUrl}/api/v1/users/${userId}`,
            {
              headers: {
                'X-Correlation-ID': correlationId,
              },
              timeout: 5000,
            },
          ),
        );

        if (!response.data.success || !response.data.data) {
          throw new Error(`User not found: ${userId}`);
        }

        return response.data.data;
      },
    );

    await this.redis.setJson(cacheKey, user, this.CACHE_TTL);
    this.logger.log(`[${correlationId}] User ${userId} cached`);

    return user;
  }

  async getUserPreferences(
    userId: string,
    correlationId: string,
  ): Promise<UserResponse['preferences']> {
    const user = await this.getUserById(userId, correlationId);
    return user.preferences;
  }

  private async recordCacheHit(): Promise<void> {
    try {
      await this.redis.increment('metrics:cache:user:hits');
    } catch {
      // Silently fail - metrics shouldn't break main functionality
    }
  }

  private async recordCacheMiss(): Promise<void> {
    try {
      await this.redis.increment('metrics:cache:user:misses');
    } catch {
      // Silently fail - metrics shouldn't break main functionality
    }
  }
}
