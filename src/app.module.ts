import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import configuration from './config/configuration';
import { PrismaService } from './prisma/prisma.service';
import { RedisService } from './redis/redis.service';
import { CircuitBreakerService } from './circuit.breaker/circuit.breaker.service';
import { TemplateOrchestratorClient } from './clients/template.orchestrator.client';
import { ApiGatewayClient } from './clients/api.gateway.client';
import { SendGridService } from './email/sendgrid.service';
import { EmailProcessorService } from './email/email.processor.service';
import { RabbitMQService } from './rabbitmq/rabbitmq.service';
import { HealthController } from './health/health.controller';
import { HealthService } from './health/health.service';
import { MetricsController } from './metrics/metrics.controller';
import { MetricsService } from './metrics/metrics.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
  ],
  controllers: [HealthController, MetricsController],
  providers: [
    PrismaService,
    RedisService,
    MetricsService,
    CircuitBreakerService,
    TemplateOrchestratorClient,
    ApiGatewayClient,
    SendGridService,
    EmailProcessorService,
    RabbitMQService,
    HealthService,
  ],
})
export class AppModule {}
