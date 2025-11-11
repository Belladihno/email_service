import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: true,
    credentials: true,
  });

  // swagger config
  const config = new DocumentBuilder()
    .setTitle('Email Service API')
    .setDescription('Distributed Notification System - Email Service')
    .setVersion('1.0')
    .addTag('health', 'Health check endpoints')
    .addTag('email', 'Email notification endpoints')
    .addBearerAuth()
    .addServer('http://localhost:3003', 'Development')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Email Service API Docs',
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port', 3003);

  await app.listen(port);

  logger.log(`Email Service is running on port ${port}`);
  logger.log(`Environment: ${configService.get<string>('nodeEnv')}`);
  logger.log(`Health check available at: http://localhost:${port}/health`);
  logger.log(`API Documentation: http://localhost:${port}/api/docs`);
}
bootstrap().catch((error) => {
  console.error('Failed to start application', error);
  process.exit(1);
});
