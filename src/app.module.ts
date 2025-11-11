import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import configuration from './config/configuration';
import { PrismaService } from './prisma/prisma.service';
import { RedisService } from './redis/redis.service';
import { CircuitBreakerService } from './circuit.breaker/circuit.breaker.service';
import { UserClient } from './clients/user.client';
import { TemplateClient } from './clients/template.client';
import { ApiGatewayClient } from './clients/api.gateway.client';
import { SendGridService } from './email/sendgrid.service';
import { EmailProcessorService } from './email/email.processor.service';
import { RabbitMQService } from './rabbitmq/rabbitmq.service';
import { HealthController } from './health/health.controller';
import { HealthService } from './health/health.service';

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
  controllers: [HealthController],
  providers: [
    PrismaService,
    RedisService,
    CircuitBreakerService,
    UserClient,
    TemplateClient,
    ApiGatewayClient,
    SendGridService,
    EmailProcessorService,
    RabbitMQService,
    HealthService,
  ],
})
export class AppModule {}
