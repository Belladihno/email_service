import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CircuitBreakerService } from 'src/circuit.breaker/circuit.breaker.service';
import { RedisService } from '../redis/redis.service';
import { ApiResponse, TemplateResponse, UserData } from '../types';

@Injectable()
export class TemplateClient {
  private readonly logger = new Logger(TemplateClient.name);
  private readonly baseUrl: string;
  private readonly CACHE_TTL = 600; // 10 minutes

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
    private circuitBreaker: CircuitBreakerService,
    private redis: RedisService,
  ) {
    this.baseUrl = this.configService.get<string>(
      'services.templateServiceUrl',
    )!;
  }

  async getTemplateByCode(
    templateCode: string,
    correlationId: string,
  ): Promise<TemplateResponse> {
    const cacheKey = `template:${templateCode}`;

    const cached = await this.redis.getJson<TemplateResponse>(cacheKey);
    if (cached) {
      this.logger.log(
        `[${correlationId}] Template ${templateCode} found in cache`,
      );
      await this.recordCacheHit();
      return cached;
    }

    await this.recordCacheMiss();

    this.logger.log(
      `[${correlationId}] Fetching template ${templateCode} from Template Service`,
    );

    const template = await this.circuitBreaker.executeWithCircuitBreaker(
      'template-service',
      async () => {
        const response = await firstValueFrom(
          this.httpService.get<ApiResponse<TemplateResponse>>(
            `${this.baseUrl}/api/v1/templates/code/${templateCode}`,
            {
              headers: {
                'X-Correlation-ID': correlationId,
              },
              timeout: 5000,
            },
          ),
        );

        if (!response.data.success || !response.data.data) {
          throw new Error(`Template not found: ${templateCode}`);
        }

        return response.data.data;
      },
    );

    await this.redis.setJson(cacheKey, template, this.CACHE_TTL);
    this.logger.log(`[${correlationId}] Template ${templateCode} cached`);

    return template;
  }

  renderTemplate(
    template: TemplateResponse,
    variables: UserData,
  ): { subject: string; body: string } {
    let subject = template.subject;
    let body = template.body;

    const variableMap: Record<string, string> = {
      name: variables.name,
      link: variables.link,
      ...variables.meta,
    };

    for (const [key, value] of Object.entries(variableMap)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      subject = subject.replace(regex, value);
      body = body.replace(regex, value);
    }

    return { subject, body };
  }

  private async recordCacheHit(): Promise<void> {
    try {
      await this.redis.increment('metrics:cache:template:hits');
    } catch {
      // Silently fail - metrics shouldn't break main functionality
    }
  }

  private async recordCacheMiss(): Promise<void> {
    try {
      await this.redis.increment('metrics:cache:template:misses');
    } catch {
      // Silently fail - metrics shouldn't break main functionality
    }
  }
}
