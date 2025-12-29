const { consume, getChannel } = require('../../../../shared/infrastructure/messaging/rabbitmq');
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

          // Obtener número de intentos del header
          const retryCount = this._getRetryCount(msg);
          const isRetryFromDLQ = msg.properties.headers?.['x-retried-from-dlq'] || false;

          logger.info(`Procesando notificación`, {
            notificationId: event.payload.notificationId,
            attempt: retryCount + 1,
            maxRetries: this.maxRetries,
            isRetryFromDLQ,
          });

          // Si viene de DLQ, resetear la notificación para reintento
          if (isRetryFromDLQ) {
            await this._resetNotificationForRetry(event.payload.notificationId);
          }

          // Procesar la notificación
          await this.processNotificationUseCase.execute({
            paymentId: event.payload.paymentId,
            notificationId: event.payload.notificationId,
            amount: event.payload.amount,
            currency: event.payload.currency,
            email: event.payload.email,
          });

          // ACK - mensaje procesado exitosamente
          channel.ack(msg);

          const duration = Date.now() - startTime;
          logger.info(`✅ Mensaje procesado exitosamente`, {
            notificationId: event.payload.notificationId,
            duration: `${duration}ms`,
          });

        } catch (error) {
          const retryCount = this._getRetryCount(msg);
          
          logger.error(`❌ Error procesando mensaje`, {
            eventId: event?.id,
            notificationId: event?.payload?.notificationId,
            error: error.message,
            attempt: retryCount + 1,
            maxRetries: this.maxRetries,
          });

          if (retryCount < this.maxRetries - 1) {
            // Aún hay reintentos disponibles
            const delay = this._calculateBackoff(retryCount);
            
            logger.warn(`🔄 Reintentando en ${delay}ms`, {
              notificationId: event?.payload?.notificationId,
              nextAttempt: retryCount + 2,
            });

            // Esperar antes de hacer NACK con requeue
            await this._sleep(delay);
            
            // NACK con requeue - vuelve a la cola
            channel.nack(msg, false, true);

          } else {
            // Máximo de reintentos alcanzado
            logger.error(`💀 Máximo de reintentos alcanzado, enviando a DLQ`, {
              notificationId: event?.payload?.notificationId,
              totalAttempts: retryCount + 1,
            });

            // Marcar notificación como FAILED en la BD
            if (event?.payload?.notificationId) {
              await this._markNotificationAsFailed(
                event.payload.notificationId,
                error.message
              );
            }

            // NACK sin requeue - va a la DLQ
            channel.nack(msg, false, false);
          }
        }
      },
      { noAck: false }
    );

    logger.info(`Consumer iniciado y escuchando mensajes`);
  }

  /**
   * Obtiene el número de reintentos del mensaje
   */
  _getRetryCount(msg) {
    const deaths = msg.properties.headers?.['x-death'];
    if (!deaths || deaths.length === 0) return 0;
    
    // Sumar todos los conteos de muerte
    return deaths.reduce((acc, death) => acc + (death.count || 0), 0);
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