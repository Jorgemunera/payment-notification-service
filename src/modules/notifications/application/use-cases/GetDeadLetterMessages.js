const { getChannel } = require('../../../../shared/infrastructure/messaging/rabbitmq');
const { getDeadLetterMessages } = require('../../../../shared/infrastructure/messaging/setup');
const { Logger } = require('../../../../shared/utils/logger');

const logger = new Logger('USE-CASE:GET-DLQ-MESSAGES');

class GetDeadLetterMessages {
  constructor() {}

  async execute({ maxMessages = 100 }) {
    logger.info(`Obteniendo mensajes de la Dead Letter Queue`, { maxMessages });

    const channel = getChannel();
    const messages = await getDeadLetterMessages(channel, maxMessages);

    logger.info(`Mensajes obtenidos de DLQ`, { count: messages.length });

    return {
      count: messages.length,
      messages: messages.map(msg => ({
        messageId: msg.messageId,
        paymentId: msg.content.payload?.paymentId,
        notificationId: msg.content.payload?.notificationId,
        originalQueue: msg.originalQueue,
        reason: msg.reason,
        failedAt: msg.failedAt,
        eventType: msg.content.type,
        timestamp: msg.content.timestamp,
      })),
    };
  }
}

module.exports = GetDeadLetterMessages;