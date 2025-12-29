const Redis = require('ioredis');
const config = require('../../../config');
const { Logger } = require('../../utils/logger');

const logger = new Logger('REDIS');

// Cliente Redis
const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    logger.warn(`Reintentando conexión en ${delay}ms (intento ${times})`);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

// Event listeners
redis.on('connect', () => {
  logger.info('Conectado a Redis');
});

redis.on('error', (err) => {
  logger.error('Error en Redis', { error: err.message });
});

redis.on('close', () => {
  logger.warn('Conexión a Redis cerrada');
});

// ============================================
// IDEMPOTENCIA
// ============================================

/**
 * Guarda una clave de idempotencia con su resultado
 * @param {string} key - Clave de idempotencia
 * @param {object} value - Valor a guardar (resultado del pago)
 * @param {number} ttlHours - Tiempo de vida en horas
 */
async function setIdempotencyKey(key, value, ttlHours = config.redis.idempotencyTtlHours) {
  const redisKey = `idempotency:${key}`;
  const ttlSeconds = ttlHours * 60 * 60;
  
  await redis.set(redisKey, JSON.stringify(value), 'EX', ttlSeconds);
  logger.debug(`Idempotency key guardada: ${key}`, { ttlHours });
}

/**
 * Obtiene el resultado de una clave de idempotencia
 * @param {string} key - Clave de idempotencia
 * @returns {object|null} - Resultado guardado o null si no existe
 */
async function getIdempotencyKey(key) {
  const redisKey = `idempotency:${key}`;
  const value = await redis.get(redisKey);
  
  if (value) {
    logger.debug(`Idempotency key encontrada: ${key}`);
    return JSON.parse(value);
  }
  
  logger.debug(`Idempotency key no encontrada: ${key}`);
  return null;
}

// ============================================
// DISTRIBUTED LOCKS
// ============================================

/**
 * Intenta adquirir un lock distribuido
 * @param {string} lockName - Nombre del lock
 * @param {number} ttlMs - Tiempo de vida del lock en milisegundos
 * @returns {boolean} - True si se adquirió el lock
 */
async function acquireLock(lockName, ttlMs = 10000) {
  const lockKey = `lock:${lockName}`;
  const lockValue = Date.now().toString();
  
  // SET NX (solo si no existe) con expiración
  const result = await redis.set(lockKey, lockValue, 'PX', ttlMs, 'NX');
  
  if (result === 'OK') {
    logger.debug(`Lock adquirido: ${lockName}`);
    return true;
  }
  
  logger.debug(`Lock no disponible: ${lockName}`);
  return false;
}

/**
 * Libera un lock distribuido
 * @param {string} lockName - Nombre del lock
 */
async function releaseLock(lockName) {
  const lockKey = `lock:${lockName}`;
  await redis.del(lockKey);
  logger.debug(`Lock liberado: ${lockName}`);
}

/**
 * Ejecuta una función con un lock distribuido
 * @param {string} lockName - Nombre del lock
 * @param {function} callback - Función a ejecutar
 * @param {number} ttlMs - Tiempo de vida del lock
 * @param {number} maxWaitMs - Tiempo máximo de espera para adquirir el lock
 */
async function withLock(lockName, callback, ttlMs = 10000, maxWaitMs = 5000) {
  const startTime = Date.now();
  
  // Intentar adquirir el lock con reintentos
  while (Date.now() - startTime < maxWaitMs) {
    const acquired = await acquireLock(lockName, ttlMs);
    
    if (acquired) {
      try {
        return await callback();
      } finally {
        await releaseLock(lockName);
      }
    }
    
    // Esperar antes de reintentar
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  throw new Error(`No se pudo adquirir el lock: ${lockName} después de ${maxWaitMs}ms`);
}

// ============================================
// HEALTH CHECK & CLOSE
// ============================================

/**
 * Verifica la conexión a Redis
 */
async function healthCheck() {
  try {
    const result = await redis.ping();
    return { status: 'healthy', ping: result };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}

/**
 * Cierra la conexión a Redis
 */
async function close() {
  logger.info('Cerrando conexión a Redis...');
  await redis.quit();
  logger.info('Conexión cerrada');
}

module.exports = {
  redis,
  setIdempotencyKey,
  getIdempotencyKey,
  acquireLock,
  releaseLock,
  withLock,
  healthCheck,
  close,
};