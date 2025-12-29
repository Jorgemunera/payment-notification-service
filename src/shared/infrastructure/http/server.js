const express = require('express');
const config = require('../../../config');
const { setupSwagger } = require('./swagger');
const { Logger } = require('../../utils/logger');
const { healthCheck: dbHealthCheck } = require('../database/postgres');
const { healthCheck: redisHealthCheck } = require('../cache/redis');
const { healthCheck: rabbitmqHealthCheck } = require('../messaging/rabbitmq');

const logger = new Logger('HTTP:SERVER');

function createServer({ paymentRoutes, notificationRoutes }) {
  const app = express();

  // ============================================
  // MIDDLEWARES
  // ============================================

  // Parse JSON bodies
  app.use(express.json());

  // Request logging
  app.use((req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
      
      logger[logLevel](`${req.method} ${req.path}`, {
        status: res.statusCode,
        duration: `${duration}ms`,
      });
    });
    
    next();
  });

  // ============================================
  // SWAGGER DOCUMENTATION
  // ============================================

  setupSwagger(app);

  // ============================================
  // ROUTES
  // ============================================

  /**
   * @swagger
   * /health:
   *   get:
   *     summary: Health check del servicio
   *     description: Verifica el estado de todas las conexiones (PostgreSQL, Redis, RabbitMQ)
   *     tags: [Health]
   *     responses:
   *       200:
   *         description: Servicio saludable
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: healthy
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *                 services:
   *                   type: object
   *                   properties:
   *                     database:
   *                       type: object
   *                     redis:
   *                       type: object
   *                     rabbitmq:
   *                       type: object
   *       503:
   *         description: Servicio no saludable
   */
  app.get('/health', async (req, res) => {
    const [dbStatus, redisStatus, rabbitmqStatus] = await Promise.all([
      dbHealthCheck(),
      redisHealthCheck(),
      rabbitmqHealthCheck(),
    ]);

    const isHealthy = 
      dbStatus.status === 'healthy' &&
      redisStatus.status === 'healthy' &&
      rabbitmqStatus.status === 'healthy';

    const response = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        redis: redisStatus,
        rabbitmq: rabbitmqStatus,
      },
    };

    res.status(isHealthy ? 200 : 503).json(response);
  });

  // Payment routes
  app.use('/payments', paymentRoutes);

  // Notification routes
  app.use('/notifications', notificationRoutes);

  // ============================================
  // 404 HANDLER
  // ============================================

  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Ruta no encontrada: ${req.method} ${req.path}`,
      },
    });
  });

  // ============================================
  // ERROR HANDLER
  // ============================================

  app.use((err, req, res, next) => {
    logger.error(`Error en request`, {
      method: req.method,
      path: req.path,
      error: err.message,
      stack: config.nodeEnv === 'development' ? err.stack : undefined,
    });

    // Si el error tiene un método toJSON (nuestros errores de dominio)
    if (typeof err.toJSON === 'function') {
      return res.status(err.statusCode || 500).json(err.toJSON());
    }

    // Error genérico
    res.status(err.statusCode || 500).json({
      success: false,
      error: {
        code: err.code || 'INTERNAL_ERROR',
        message: config.nodeEnv === 'development' 
          ? err.message 
          : 'Error interno del servidor',
      },
    });
  });

  return app;
}

function startServer(app) {
  return new Promise((resolve) => {
    const server = app.listen(config.port, () => {
      logger.info(`═══════════════════════════════════════════════════════════`);
      logger.info(`🚀 Servidor iniciado`);
      logger.info(`───────────────────────────────────────────────────────────`);
      logger.info(`   URL:      http://localhost:${config.port}`);
      logger.info(`   API Docs: http://localhost:${config.port}/api-docs`);
      logger.info(`   Health:   http://localhost:${config.port}/health`);
      logger.info(`   Env:      ${config.nodeEnv}`);
      logger.info(`═══════════════════════════════════════════════════════════`);
      resolve(server);
    });
  });
}

module.exports = {
  createServer,
  startServer,
};