const { NotificationStatus } = require('../../domain/entities/Notification');
const NotificationErrors = require('../../domain/errors/NotificationErrors');
const { Logger } = require('../../../../shared/utils/logger');

const logger = new Logger('USE-CASE:PROCESS-NOTIFICATION');

class ProcessNotification {
  constructor({ notificationRepository, emailService }) {
    this.notificationRepository = notificationRepository;
    this.emailService = emailService;
  }

  async execute({ paymentId, notificationId, amount, currency, email }) {
    logger.info(`Procesando notificación`, { notificationId, paymentId });

    // 1. BUSCAR NOTIFICACIÓN
    const notification = await this.notificationRepository.findById(notificationId);

    if (!notification) {
      logger.error(`Notificación no encontrada`, { notificationId });
      throw new NotificationErrors.NotificationNotFoundError(notificationId);
    }

    // 2. VERIFICAR SI YA FUE ENVIADA
    if (notification.isSent()) {
      logger.info(`Notificación ya fue enviada previamente`, { notificationId });
      return notification;
    }

    // 3. MARCAR COMO PROCESSING E INCREMENTAR ATTEMPTS
    notification.markAsProcessing();
    await this.notificationRepository.update(notification);

    logger.info(`Notificación marcada como PROCESSING`, {
      notificationId,
      attempts: notification.attempts,
    });

    // 4. ENVIAR EMAIL
    const formattedAmount = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency || 'COP',
    }).format(amount);

    await this.emailService.send({
      to: email,
      subject: `Confirmación de pago ${paymentId}`,
      body: `Su pago por ${formattedAmount} ha sido procesado exitosamente. ID de transacción: ${paymentId}`,
    });

    // 5. MARCAR COMO SENT
    notification.markAsSent();
    await this.notificationRepository.update(notification);

    logger.info(`Notificación enviada exitosamente`, {
      notificationId,
      paymentId,
      recipient: email,
    });

    return notification;
  }
}

module.exports = ProcessNotification;