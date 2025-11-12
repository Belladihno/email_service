import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CircuitBreakerService } from '../circuit.breaker/circuit.breaker.service';
import {
  ApiResponse,
  RenderTemplateRequest,
  RenderTemplateResponse,
} from 'src/types';

@Injectable()
export class TemplateOrchestratorClient {
  private readonly logger = new Logger(TemplateOrchestratorClient.name);
  private readonly baseUrl: string;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
    private circuitBreaker: CircuitBreakerService,
  ) {
    this.baseUrl = this.configService.get<string>(
      'services.templateServiceUrl',
    )!;
  }

  async renderForUser(
    request: RenderTemplateRequest,
  ): Promise<RenderTemplateResponse> {
    const { correlation_id } = request;

    this.logger.log(
      `[${correlation_id}] Requesting rendered template for user ${request.user_id}`,
    );

    const rendered = await this.circuitBreaker.executeWithCircuitBreaker(
      'template-service',
      async () => {
        const response = await firstValueFrom(
          this.httpService.post<ApiResponse<RenderTemplateResponse>>(
            `${this.baseUrl}/api/v1/templates/render`,
            request,
            {
              headers: {
                'X-Correlation-ID': correlation_id,
                'Content-Type': 'application/json',
              },
              timeout: 10000,
            },
          ),
        );

        if (!response.data.success || !response.data.data) {
          throw new Error('Failed to render template');
        }

        return response.data.data;
      },
    );

    this.logger.log(
      `[${correlation_id}] Template rendered successfully for ${request.user_id}`,
    );

    return rendered;
  }
}
