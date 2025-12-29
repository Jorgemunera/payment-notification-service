const { Notification, NotificationType } = require('../../domain/entities/Notification');
const { generateNotificationId } = require('../../../../shared/utils/id-generator');
const { Logger } = require('../../../../shared/utils/logger');

const logger = new Logger('USE-CASE:CREATE-NOTIFICATION');

class CreateNotification {
  constructor({ notificationRepository }) {
    this.notificationRepository = notificationRepository;
  }

  async execute({ paymentId, email }) {
    logger.info(`Creando notificación para pago`, { paymentId, email });

    const notificationId = generateNotificationId();

    const notification = new Notification({
      id: notificationId,
      paymentId,
      type: NotificationType.EMAIL,
      recipient: email,
    });

    await this.notificationRepository.save(notification);

    logger.info(`Notificación creada`, { 
      notificationId, 
      paymentId,
      status: notification.status,
    });

    return notification;
  }
}

module.exports = CreateNotification;