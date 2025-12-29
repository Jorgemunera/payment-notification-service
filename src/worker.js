const { Logger } = require('./shared/utils/logger');
const config = require('./config');
const postgres = require('./shared/infrastructure/database/postgres');
const redis = require('./shared/infrastructure/cache/redis');
const rabbitmq = require('./shared/infrastructure/messaging/rabbitmq');
const { setupTopology } = require('./shared/infrastructure/messaging/setup');
const container = require('./container');

const logger = new Logger('WORKER');

async function main() {
  try {
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('🔧 INICIANDO PAYMENT NOTIFICATION SERVICE - WORKER');
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
    // 5. INICIAR CONSUMER DE NOTIFICACIONES
    // ============================================
    logger.info('Iniciando consumer de notificaciones...');
    const notificationConsumer = container.notificationConsumer;
    await notificationConsumer.start();

    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('✅ WORKER INICIADO Y ESCUCHANDO MENSAJES');
    logger.info('───────────────────────────────────────────────────────────');
    logger.info(`   Max Retries:     ${config.notifications.maxRetries}`);
    logger.info(`   Service Enabled: ${config.notifications.serviceEnabled}`);
    logger.info('═══════════════════════════════════════════════════════════');

    // ============================================
    // 6. MANEJO DE SEÑALES DE TERMINACIÓN
    // ============================================
    const gracefulShutdown = async (signal) => {
      logger.info(`\n${signal} recibido. Cerrando conexiones...`);
      
      try {
        await rabbitmq.close();
        await postgres.close();
        await redis.close();
        logger.info('Conexiones cerradas. Saliendo...');
        process.exit(0);
      } catch (error) {
        logger.error('Error durante el shutdown', { error: error.message });
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Mantener el proceso corriendo
    process.stdin.resume();

  } catch (error) {
    logger.error('❌ Error fatal iniciando el worker', { 
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

// Ejecutar
main();