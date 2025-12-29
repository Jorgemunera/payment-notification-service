const { publish } = require('../../../../shared/infrastructure/messaging/rabbitmq');
const { EXCHANGES } = require('../../../../shared/infrastructure/messaging/setup');
const { Logger } = require('../../../../shared/utils/logger');

const logger = new Logger('PUBLISHER:PAYMENT');

class PaymentEventPublisher {
  async publish(event) {
    logger.info(`Publicando evento`, { 
      eventId: event.id, 
      type: event.type,
      paymentId: event.payload.paymentId,
    });

    try {
      await publish(
        EXCHANGES.PAYMENTS.name,
        event.type,
        event,
        {
          messageId: event.id,
          headers: {
            'x-event-type': event.type,
            'x-timestamp': event.timestamp,
          },
        }
      );

      logger.info(`Evento publicado exitosamente`, { eventId: event.id });
      
      return true;
    } catch (error) {
      logger.error(`Error publicando evento`, { 
        eventId: event.id, 
        error: error.message,
      });
      throw error;
    }
  }
}

module.exports = PaymentEventPublisher;