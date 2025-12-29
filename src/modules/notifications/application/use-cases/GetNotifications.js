const { Logger } = require('../../../../shared/utils/logger');

const logger = new Logger('USE-CASE:GET-NOTIFICATIONS');

class GetNotifications {
  constructor({ notificationRepository }) {
    this.notificationRepository = notificationRepository;
  }

  async execute({ status, paymentId, limit = 50, offset = 0 }) {
    logger.info(`Buscando notificaciones`, { status, paymentId, limit, offset });

    const filters = {};
    
    if (status) {
      filters.status = status;
    }
    
    if (paymentId) {
      filters.paymentId = paymentId;
    }

    const { notifications, total } = await this.notificationRepository.findAll(
      filters,
      { limit, offset }
    );

    logger.info(`Notificaciones encontradas`, { 
      count: notifications.length, 
      total,
    });

    return {
      notifications: notifications.map(n => n.toJSON()),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + notifications.length < total,
      },
    };
  }
}

module.exports = GetNotifications;