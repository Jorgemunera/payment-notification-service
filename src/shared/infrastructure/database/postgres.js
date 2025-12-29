const { Pool } = require('pg');
const config = require('../../../config');
const { Logger } = require('../../utils/logger');

const logger = new Logger('POSTGRES');

// Pool de conexiones
const pool = new Pool({
  host: config.postgres.host,
  port: config.postgres.port,
  database: config.postgres.database,
  user: config.postgres.user,
  password: config.postgres.password,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Event listeners
pool.on('connect', () => {
  logger.debug('Nueva conexión establecida');
});

pool.on('error', (err) => {
  logger.error('Error inesperado en el pool', { error: err.message });
});

/**
 * Ejecuta una query simple
 */
async function query(text, params = []) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug(`Query ejecutada en ${duration}ms`, { rows: result.rowCount });
    return result;
  } catch (error) {
    logger.error('Error ejecutando query', { error: error.message, query: text });
    throw error;
  }
}

/**
 * Obtiene un cliente para transacciones
 */
async function getClient() {
  const client = await pool.connect();
  return client;
}

/**
 * Ejecuta una función dentro de una transacción
 */
async function withTransaction(callback) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Verifica la conexión a la base de datos
 */
async function healthCheck() {
  try {
    const result = await pool.query('SELECT NOW()');
    return { status: 'healthy', timestamp: result.rows[0].now };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}

/**
 * Cierra todas las conexiones del pool
 */
async function close() {
  logger.info('Cerrando pool de conexiones...');
  await pool.end();
  logger.info('Pool cerrado');
}

module.exports = {
  pool,
  query,
  getClient,
  withTransaction,
  healthCheck,
  close,
};