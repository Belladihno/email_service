import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port', 3003);

  await app.listen(port);

  logger.log(`Email Service is running on port ${port}`);
  logger.log(`Environment: ${configService.get<string>('nodeEnv')}`);
  logger.log(`Health check available at: http://localhost:${port}/health`);
}
bootstrap().catch((error) => {
  console.error('Failed to start application', error);
  process.exit(1);
});
