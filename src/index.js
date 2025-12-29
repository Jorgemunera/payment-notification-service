const { Logger } = require('./shared/utils/logger');
const config = require('./config');
const postgres = require('./shared/infrastructure/database/postgres');
const redis = require('./shared/infrastructure/cache/redis');
const rabbitmq = require('./shared/infrastructure/messaging/rabbitmq');
const { setupTopology } = require('./shared/infrastructure/messaging/setup');
const container = require('./container');
const { createServer, startServer } = require('./shared/infrastructure/http/server');

const logger = new Logger('API');

async function main() {
  try {
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('🚀 INICIANDO PAYMENT NOTIFICATION SERVICE - API');
    logger.info('═══════════════════════════════════════════════════════════');

    // ============================================
    // 1. VERIFICAR CONEXIÓN A POSTGRESQL
    // ============================================
    logger.info('Conectando a PostgreSQL...');
    const dbHealth = await postgres.healthCheck();
    if (dbHealth.status !== 'healthy') {
      throw new Error(`PostgreSQL no disponible: ${dbHealth.error}`);
    }
    logger.info('✅ PostgreSQL conectado');

    // ============================================
    // 2. VERIFICAR CONEXIÓN A REDIS
    // ============================================
    logger.info('Conectando a Redis...');
    const redisHealth = await redis.healthCheck();
    if (redisHealth.status !== 'healthy') {
      throw new Error(`Redis no disponible: ${redisHealth.error}`);
    }
    logger.info('✅ Redis conectado');

    // ============================================
    // 3. CONECTAR A RABBITMQ Y CONFIGURAR TOPOLOGÍA
    // ============================================
    logger.info('Conectando a RabbitMQ...');
    const channel = await rabbitmq.connect();
    await setupTopology(channel);
    logger.info('✅ RabbitMQ conectado y topología configurada');

    // ============================================
    // 4. INICIALIZAR CONTAINER DE DEPENDENCIAS
    // ============================================
    logger.info('Inicializando dependencias...');
    await container.initialize();
    logger.info('✅ Dependencias inicializadas');

    // ============================================
    // 5. CREAR Y ARRANCAR SERVIDOR HTTP
    // ============================================
    logger.info('Iniciando servidor HTTP...');
    const app = createServer({
      paymentRoutes: container.paymentRoutes,
      notificationRoutes: container.notificationRoutes,
    });

    await startServer(app);

    // ============================================
    // 6. MANEJO DE SEÑALES DE TERMINACIÓN
    // ============================================
    const gracefulShutdown = async (signal) => {
      logger.info(`\n${signal} recibido. Cerrando conexiones...`);
      
      try {
        await postgres.close();
        await redis.close();
        await rabbitmq.close();
        logger.info('Conexiones cerradas. Saliendo...');
        process.exit(0);
      } catch (error) {
        logger.error('Error durante el shutdown', { error: error.message });
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('❌ Error fatal iniciando la aplicación', { 
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

// Ejecutar
main();