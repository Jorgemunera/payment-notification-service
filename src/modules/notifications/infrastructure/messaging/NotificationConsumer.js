const { getChannel } = require('../../../../shared/infrastructure/messaging/rabbitmq');
const { QUEUES } = require('../../../../shared/infrastructure/messaging/setup');
const { NotificationStatus } = require('../../domain/entities/Notification');
const config = require('../../../../config');
const { Logger } = require('../../../../shared/utils/logger');

const logger = new Logger('CONSUMER:NOTIFICATION');

class NotificationConsumer {
  constructor({ processNotificationUseCase, notificationRepository }) {
    this.processNotificationUseCase = processNotificationUseCase;
    this.notificationRepository = notificationRepository;
    this.maxRetries = config.notifications.maxRetries;
  }

  async start() {
    logger.info(`Iniciando consumer de notificaciones`, {
      queue: QUEUES.NOTIFICATIONS.name,
      maxRetries: this.maxRetries,
    });

    const channel = getChannel();

    await channel.consume(
      QUEUES.NOTIFICATIONS.name,
      async (msg) => {
        if (!msg) return;

        const startTime = Date.now();
        let event;

        try {
          event = JSON.parse(msg.content.toString());

          logger.info(`═══════════════════════════════════════════════════════════`);
          logger.info(`📨 MENSAJE RECIBIDO`);
          logger.info(`───────────────────────────────────────────────────────────`);
          logger.info(`   Event ID:        ${event.id}`);
          logger.info(`   Payment ID:      ${event.payload.paymentId}`);
          logger.info(`   Notification ID: ${event.payload.notificationId}`);
          logger.info(`═══════════════════════════════════════════════════════════`);

          const isRetryFromDLQ = msg.properties.headers?.['x-retried-from-dlq'] || false;

          // Si viene de DLQ, resetear la notificación para reintento
          if (isRetryFromDLQ) {
            await this._resetNotificationForRetry(event.payload.notificationId);
          }

          // Intentar procesar con reintentos internos
          const success = await this._processWithRetries(event);

          if (success) {
            // ACK - mensaje procesado exitosamente
            channel.ack(msg);

            const duration = Date.now() - startTime;
            logger.info(`✅ Mensaje procesado exitosamente`, {
              notificationId: event.payload.notificationId,
              duration: `${duration}ms`,
            });
          } else {
            // Todos los reintentos fallaron - enviar a DLQ
            logger.error(`💀 Máximo de reintentos alcanzado, enviando a DLQ`, {
              notificationId: event.payload.notificationId,
              totalAttempts: this.maxRetries,
            });

            // NACK sin requeue - va a la DLQ
            channel.nack(msg, false, false);
          }

        } catch (error) {
          // Error inesperado (parsing, etc.)
          logger.error(`❌ Error inesperado procesando mensaje`, {
            error: error.message,
          });

          // NACK sin requeue - va a la DLQ
          channel.nack(msg, false, false);
        }
      },
      { noAck: false }
    );

    logger.info(`Consumer iniciado y escuchando mensajes`);
  }

  /**
   * Procesa la notificación con reintentos internos
   * @returns {boolean} true si se procesó exitosamente, false si agotó reintentos
   */
  async _processWithRetries(event) {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.info(`Procesando notificación`, {
          notificationId: event.payload.notificationId,
          attempt: attempt,
          maxRetries: this.maxRetries,
        });

        await this.processNotificationUseCase.execute({
          paymentId: event.payload.paymentId,
          notificationId: event.payload.notificationId,
          amount: event.payload.amount,
          currency: event.payload.currency,
          email: event.payload.email,
        });

        // Éxito
        return true;

      } catch (error) {
        logger.error(`❌ Error en intento ${attempt}/${this.maxRetries}`, {
          notificationId: event.payload.notificationId,
          error: error.message,
        });

        if (attempt < this.maxRetries) {
          // Calcular delay con backoff exponencial
          const delay = this._calculateBackoff(attempt - 1);
          
          logger.warn(`🔄 Reintentando en ${delay}ms`, {
            notificationId: event.payload.notificationId,
            nextAttempt: attempt + 1,
          });

          await this._sleep(delay);
        } else {
          // Último intento falló - marcar como FAILED
          await this._markNotificationAsFailed(
            event.payload.notificationId,
            error.message
          );
        }
      }
    }

    // Todos los intentos fallaron
    return false;
  }

  /**
   * Calcula el delay con backoff exponencial
   * Intento 0: 1000ms
   * Intento 1: 2000ms
   * Intento 2: 4000ms
   */
  _calculateBackoff(retryCount) {
    return Math.pow(2, retryCount) * 1000;
  }

  /**
   * Pausa la ejecución
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Marca una notificación como fallida en la BD
   */
  async _markNotificationAsFailed(notificationId, errorMessage) {
    try {
      const notification = await this.notificationRepository.findById(notificationId);

      if (notification) {
        notification.markAsFailed(errorMessage);
        await this.notificationRepository.update(notification);

        logger.info(`Notificación marcada como FAILED`, { notificationId });
      }
    } catch (error) {
      logger.error(`Error marcando notificación como FAILED`, {
        notificationId,
        error: error.message,
      });
    }
  }

  /**
   * Resetea una notificación para reintento desde DLQ
   */
  async _resetNotificationForRetry(notificationId) {
    try {
      const notification = await this.notificationRepository.findById(notificationId);

      if (notification && notification.status === NotificationStatus.FAILED) {
        notification.resetForRetry();
        await this.notificationRepository.update(notification);

        logger.info(`Notificación reseteada para reintento`, { notificationId });
      }
    } catch (error) {
      logger.error(`Error reseteando notificación`, {
        notificationId,
        error: error.message,
      });
    }
  }
}

module.exports = NotificationConsumer;