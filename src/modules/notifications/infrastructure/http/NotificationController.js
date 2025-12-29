const { Logger } = require('../../../../shared/utils/logger');

const logger = new Logger('CONTROLLER:NOTIFICATION');

class NotificationController {
  constructor({
    getNotificationsUseCase,
    getDeadLetterMessagesUseCase,
    retryDeadLetterMessageUseCase,
    retryAllDeadLetterMessagesUseCase,
    emailService,
    notificationRepository,
  }) {
    this.getNotificationsUseCase = getNotificationsUseCase;
    this.getDeadLetterMessagesUseCase = getDeadLetterMessagesUseCase;
    this.retryDeadLetterMessageUseCase = retryDeadLetterMessageUseCase;
    this.retryAllDeadLetterMessagesUseCase = retryAllDeadLetterMessagesUseCase;
    this.emailService = emailService;
    this.notificationRepository = notificationRepository;
  }

  async getAll(req, res, next) {
    try {
      const { status, paymentId, limit, offset } = req.query;

      logger.info(`Obteniendo notificaciones`, { status, paymentId, limit, offset });

      const result = await this.getNotificationsUseCase.execute({
        status,
        paymentId,
        limit,
        offset,
      });

      res.status(200).json(result);

    } catch (error) {
      next(error);
    }
  }

  async getStatus(req, res, next) {
    try {
      logger.info(`Obteniendo estado del servicio de notificaciones`);

      const emailStatus = await this.emailService.getStatus();
      const counts = await this.notificationRepository.countByStatus();

      res.status(200).json({
        service: emailStatus,
        notifications: counts,
      });

    } catch (error) {
      next(error);
    }
  }

  async simulateFailure(req, res, next) {
    try {
      logger.warn(`Simulando fallo del servicio de notificaciones`);

      await this.emailService.disable();

      const status = await this.emailService.getStatus();

      res.status(200).json({
        success: true,
        message: 'Servicio de notificaciones deshabilitado',
        status: status,
      });

    } catch (error) {
      next(error);
    }
  }

  async simulateRecovery(req, res, next) {
    try {
      logger.info(`Simulando recuperación del servicio de notificaciones`);

      await this.emailService.enable();

      const status = await this.emailService.getStatus();

      res.status(200).json({
        success: true,
        message: 'Servicio de notificaciones habilitado',
        status: status,
      });

    } catch (error) {
      next(error);
    }
  }

  async getDeadLetterQueue(req, res, next) {
    try {
      const { maxMessages } = req.query;

      logger.info(`Obteniendo mensajes de DLQ`, { maxMessages });

      const result = await this.getDeadLetterMessagesUseCase.execute({ maxMessages });

      res.status(200).json(result);

    } catch (error) {
      next(error);
    }
  }

  async retryMessage(req, res, next) {
    try {
      const { messageId } = req.params;

      logger.info(`Reintentando mensaje de DLQ`, { messageId });

      const result = await this.retryDeadLetterMessageUseCase.execute({ messageId });

      res.status(200).json(result);

    } catch (error) {
      next(error);
    }
  }

  async retryAllMessages(req, res, next) {
    try {
      logger.info(`Reintentando todos los mensajes de DLQ`);

      const result = await this.retryAllDeadLetterMessagesUseCase.execute();

      res.status(200).json(result);

    } catch (error) {
      next(error);
    }
  }
}

module.exports = NotificationController;