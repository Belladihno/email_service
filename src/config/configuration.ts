export default () => ({
  port: parseInt(process.env.PORT || '3003', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    url: process.env.DATABASE_URL,
  },

  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
    emailQueue: process.env.EMAIL_QUEUE || 'email.queue',
    failedQueue: process.env.FAILED_QUEUE || 'failed.queue',
    exchangeName: process.env.EXCHANGE_NAME || 'notifications.direct',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },

  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY || '',
    fromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@yourapp.com',
    fromName: process.env.SENDGRID_FROM_NAME || 'Your App',
  },

  services: {
    userServiceUrl: process.env.USER_SERVICE_URL || 'http://localhost:3001',
    templateServiceUrl:
      process.env.TEMPLATE_SERVICE_URL || 'http://localhost:3004',
    apiGatewayUrl: process.env.API_GATEWAY_URL || 'http://localhost:3000',
  },

  circuitBreaker: {
    threshold: parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD || '5', 10),
    timeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT || '60000', 10),
    resetTimeout: parseInt(
      process.env.CIRCUIT_BREAKER_RESET_TIMEOUT || '30000',
      10,
    ),
  },

  retry: {
    maxAttempts: parseInt(process.env.MAX_RETRY_ATTEMPTS || '5', 10),
    initialDelay: parseInt(process.env.INITIAL_RETRY_DELAY || '1000', 10),
    maxDelay: parseInt(process.env.MAX_RETRY_DELAY || '32000', 10),
  },
});
