const amqp = require('amqplib');
const config = require('../../../config');
const { Logger } = require('../../utils/logger');

const logger = new Logger('RABBITMQ');

let connection = null;
let channel = null;

/**
 * Conecta a RabbitMQ y crea un canal
 */
async function connect() {
  try {
    logger.info('Conectando a RabbitMQ...');
    
    connection = await amqp.connect(config.rabbitmq.url);
    channel = await connection.createChannel();
    
    // Prefetch: procesar un mensaje a la vez
    await channel.prefetch(1);
    
    logger.info('Conectado a RabbitMQ');
    
    // Manejar errores de conexión
    connection.on('error', (err) => {
      logger.error('Error en conexión RabbitMQ', { error: err.message });
    });
    
    connection.on('close', () => {
      logger.warn('Conexión a RabbitMQ cerrada');
      channel = null;
      connection = null;
    });
    
    return channel;
    
  } catch (error) {
    logger.error('Error conectando a RabbitMQ', { error: error.message });
    throw error;
  }
}

/**
 * Obtiene el canal actual
 */
function getChannel() {
  if (!channel) {
    throw new Error('Canal de RabbitMQ no inicializado. Llama a connect() primero.');
  }
  return channel;
}

/**
 * Obtiene la conexión actual
 */
function getConnection() {
  if (!connection) {
    throw new Error('Conexión a RabbitMQ no inicializada. Llama a connect() primero.');
  }
  return connection;
}

/**
 * Publica un mensaje a un exchange
 * @param {string} exchange - Nombre del exchange
 * @param {string} routingKey - Routing key
 * @param {object} message - Mensaje a publicar
 * @param {object} options - Opciones adicionales
 */
async function publish(exchange, routingKey, message, options = {}) {
  const ch = getChannel();
  
  const messageBuffer = Buffer.from(JSON.stringify(message));
  
  const publishOptions = {
    persistent: true,
    contentType: 'application/json',
    timestamp: Date.now(),
    ...options,
  };
  
  const success = ch.publish(exchange, routingKey, messageBuffer, publishOptions);
  
  if (!success) {
    // Buffer lleno, esperar a que se vacíe
    await new Promise(resolve => ch.once('drain', resolve));
  }
  
  logger.debug(`Mensaje publicado a ${exchange} con routing key ${routingKey}`, {
    messageId: message.id || 'N/A',
  });
  
  return success;
}

/**
 * Consume mensajes de una cola
 * @param {string} queue - Nombre de la cola
 * @param {function} handler - Función que procesa cada mensaje
 */
async function consume(queue, handler) {
  const ch = getChannel();
  
  logger.info(`Iniciando consumer para cola: ${queue}`);
  
  await ch.consume(queue, async (msg) => {
    if (!msg) return;
    
    try {
      const content = JSON.parse(msg.content.toString());
      logger.debug(`Mensaje recibido de ${queue}`, { messageId: content.id || 'N/A' });
      
      await handler(content, msg);
      
      ch.ack(msg);
      logger.debug(`Mensaje procesado y ACK enviado`);
      
    } catch (error) {
      logger.error(`Error procesando mensaje de ${queue}`, { error: error.message });
      
      // NACK sin requeue - irá a la DLQ si está configurada
      ch.nack(msg, false, false);
    }
  }, { noAck: false });
}

/**
 * Verifica la conexión a RabbitMQ
 */
async function healthCheck() {
  try {
    if (!connection || !channel) {
      return { status: 'unhealthy', error: 'No conectado' };
    }
    return { status: 'healthy' };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}

/**
 * Cierra la conexión a RabbitMQ
 */
async function close() {
  logger.info('Cerrando conexión a RabbitMQ...');
  
  if (channel) {
    await channel.close();
    channel = null;
  }
  
  if (connection) {
    await connection.close();
    connection = null;
  }
  
  logger.info('Conexión cerrada');
}

module.exports = {
  connect,
  getChannel,
  getConnection,
  publish,
  consume,
  healthCheck,
  close,
};