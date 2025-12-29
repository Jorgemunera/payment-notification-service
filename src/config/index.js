require('dotenv').config();

const config = {
  // Server
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // PostgreSQL
  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT, 10) || 5432,
    database: process.env.POSTGRES_DB || 'payments_db',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    idempotencyTtlHours: parseInt(process.env.IDEMPOTENCY_TTL_HOURS, 10) || 24,
  },

  // RabbitMQ
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
  },

  // Notifications
  notifications: {
    serviceEnabled: process.env.NOTIFICATION_SERVICE_ENABLED === 'true',
    maxRetries: parseInt(process.env.NOTIFICATION_MAX_RETRIES, 10) || 3,
  },
};

module.exports = config;