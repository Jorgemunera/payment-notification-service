const { getChannel } = require('../../../../shared/infrastructure/messaging/rabbitmq');
const { retryAllDeadLetterMessages } = require('../../../../shared/infrastructure/messaging/setup');
const { Logger } = require('../../../../shared/utils/logger');

const logger = new Logger('USE-CASE:RETRY-ALL-DLQ');

class RetryAllDeadLetterMessages {
  constructor() {}

  async execute() {
    logger.info(`Reintentando todos los mensajes de DLQ`);

    const channel = getChannel();
    const retriedCount = await retryAllDeadLetterMessages(channel);

    logger.info(`Mensajes reencolados`, { count: retriedCount });

    return {
      success: true,
      retriedCount,
      message: `${retriedCount} mensaje(s) reencolado(s) para reprocesamiento`,
    };
  }
}

module.exports = RetryAllDeadLetterMessages;