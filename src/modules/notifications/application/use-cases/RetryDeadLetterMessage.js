const { getChannel } = require('../../../../shared/infrastructure/messaging/rabbitmq');
const { retryDeadLetterMessage } = require('../../../../shared/infrastructure/messaging/setup');
const NotificationErrors = require('../../domain/errors/NotificationErrors');
const { Logger } = require('../../../../shared/utils/logger');

const logger = new Logger('USE-CASE:RETRY-DLQ-MESSAGE');

class RetryDeadLetterMessage {
  constructor({ notificationRepository }) {
    this.notificationRepository = notificationRepository;
  }

  async execute({ messageId }) {
    logger.info(`Reintentando mensaje de DLQ`, { messageId });

    const channel = getChannel();
    const found = await retryDeadLetterMessage(channel, messageId);

    if (!found) {
      logger.warn(`Mensaje no encontrado en DLQ`, { messageId });
      throw new NotificationErrors.DeadLetterMessageNotFoundError(messageId);
    }

    logger.info(`Mensaje reencolado exitosamente`, { messageId });

    return {
      success: true,
      messageId,
      message: 'Mensaje reencolado para reprocesamiento',
    };
  }
}

module.exports = RetryDeadLetterMessage;