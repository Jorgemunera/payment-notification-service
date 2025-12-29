const { Logger } = require('../../utils/logger');

const logger = new Logger('RABBITMQ:SETUP');

// ============================================
// CONFIGURACIÓN DE LA TOPOLOGÍA
// ============================================

const EXCHANGES = {
  PAYMENTS: {
    name: 'payments.events',
    type: 'topic',
    options: { durable: true },
  },
  DLX: {
    name: 'payments.dlx',
    type: 'topic',
    options: { durable: true },
  },
};

const QUEUES = {
  NOTIFICATIONS: {
    name: 'notifications.payment-events',
    options: {
      durable: true,
      deadLetterExchange: EXCHANGES.DLX.name,
      deadLetterRoutingKey: 'notification.failed',
    },
  },
  DEAD_LETTER: {
    name: 'notifications.dead-letter',
    options: {
      durable: true,
    },
  },
};

const BINDINGS = [
  {
    queue: QUEUES.NOTIFICATIONS.name,
    exchange: EXCHANGES.PAYMENTS.name,
    routingKey: 'payment.success',
  },
  {
    queue: QUEUES.DEAD_LETTER.name,
    exchange: EXCHANGES.DLX.name,
    routingKey: '#',
  },
];

// ============================================
// FUNCIONES DE SETUP
// ============================================

/**
 * Configura la topología completa de RabbitMQ
 * @param {object} channel - Canal de RabbitMQ
 */
async function setupTopology(channel) {
  logger.info('Configurando topología de RabbitMQ...');
  
  // Crear exchanges
  for (const exchange of Object.values(EXCHANGES)) {
    await channel.assertExchange(exchange.name, exchange.type, exchange.options);
    logger.debug(`Exchange creado: ${exchange.name} (${exchange.type})`);
  }
  
  // Crear colas
  for (const queue of Object.values(QUEUES)) {
    await channel.assertQueue(queue.name, queue.options);
    logger.debug(`Cola creada: ${queue.name}`);
  }
  
  // Crear bindings
  for (const binding of BINDINGS) {
    await channel.bindQueue(binding.queue, binding.exchange, binding.routingKey);
    logger.debug(`Binding creado: ${binding.exchange} -> ${binding.queue} (${binding.routingKey})`);
  }
  
  logger.info('Topología configurada exitosamente');
}

/**
 * Obtiene mensajes de la Dead Letter Queue
 * @param {object} channel - Canal de RabbitMQ
 * @param {number} maxMessages - Máximo de mensajes a obtener
 */
async function getDeadLetterMessages(channel, maxMessages = 100) {
  const messages = [];
  
  // Obtener info de la cola
  const queueInfo = await channel.checkQueue(QUEUES.DEAD_LETTER.name);
  const messageCount = Math.min(queueInfo.messageCount, maxMessages);
  
  for (let i = 0; i < messageCount; i++) {
    const msg = await channel.get(QUEUES.DEAD_LETTER.name, { noAck: false });
    
    if (msg) {
      const content = JSON.parse(msg.content.toString());
      const headers = msg.properties.headers || {};
      
      messages.push({
        messageId: msg.properties.messageId || `msg_${i}`,
        content,
        headers,
        originalQueue: headers['x-first-death-queue'] || 'unknown',
        reason: headers['x-first-death-reason'] || 'unknown',
        failedAt: headers['x-death'] ? headers['x-death'][0]?.time : null,
        deliveryTag: msg.fields.deliveryTag,
      });
      
      // Mantener el mensaje en la cola (NACK con requeue)
      channel.nack(msg, false, true);
    }
  }
  
  return messages;
}

/**
 * Reprocesa un mensaje de la DLQ
 * @param {object} channel - Canal de RabbitMQ
 * @param {string} messageId - ID del mensaje a reprocesar
 */
async function retryDeadLetterMessage(channel, messageId) {
  const queueInfo = await channel.checkQueue(QUEUES.DEAD_LETTER.name);
  let found = false;
  
  for (let i = 0; i < queueInfo.messageCount; i++) {
    const msg = await channel.get(QUEUES.DEAD_LETTER.name, { noAck: false });
    
    if (!msg) break;
    
    const msgId = msg.properties.messageId || `msg_${i}`;
    
    if (msgId === messageId) {
      // Republicar al exchange principal
      const content = JSON.parse(msg.content.toString());
      
      channel.publish(
        EXCHANGES.PAYMENTS.name,
        'payment.success',
        Buffer.from(JSON.stringify(content)),
        {
          persistent: true,
          contentType: 'application/json',
          messageId: content.id,
          headers: {
            'x-retried-from-dlq': true,
            'x-retry-timestamp': Date.now(),
          },
        }
      );
      
      // ACK para remover de la DLQ
      channel.ack(msg);
      found = true;
      logger.info(`Mensaje ${messageId} republicado desde DLQ`);
      
    } else {
      // No es el mensaje buscado, devolverlo a la cola
      channel.nack(msg, false, true);
    }
  }
  
  return found;
}

/**
 * Reprocesa todos los mensajes de la DLQ
 * @param {object} channel - Canal de RabbitMQ
 */
async function retryAllDeadLetterMessages(channel) {
  const queueInfo = await channel.checkQueue(QUEUES.DEAD_LETTER.name);
  let retriedCount = 0;
  
  logger.info(`Reprocesando ${queueInfo.messageCount} mensajes de la DLQ...`);
  
  for (let i = 0; i < queueInfo.messageCount; i++) {
    const msg = await channel.get(QUEUES.DEAD_LETTER.name, { noAck: false });
    
    if (!msg) break;
    
    const content = JSON.parse(msg.content.toString());
    
    // Republicar al exchange principal
    channel.publish(
      EXCHANGES.PAYMENTS.name,
      'payment.success',
      Buffer.from(JSON.stringify(content)),
      {
        persistent: true,
        contentType: 'application/json',
        messageId: content.id,
        headers: {
          'x-retried-from-dlq': true,
          'x-retry-timestamp': Date.now(),
        },
      }
    );
    
    // ACK para remover de la DLQ
    channel.ack(msg);
    retriedCount++;
  }
  
  logger.info(`${retriedCount} mensajes republicados desde DLQ`);
  return retriedCount;
}

module.exports = {
  EXCHANGES,
  QUEUES,
  BINDINGS,
  setupTopology,
  getDeadLetterMessages,
  retryDeadLetterMessage,
  retryAllDeadLetterMessages,
};