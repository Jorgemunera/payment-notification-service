const { Payment } = require('../../domain/entities/Payment');
const { Notification, NotificationType } = require('../../../notifications/domain/entities/Notification');
const { generatePaymentId, generateNotificationId } = require('../../../../shared/utils/id-generator');
const { Logger } = require('../../../../shared/utils/logger');

const logger = new Logger('USE-CASE:CREATE-PAYMENT');

class CreatePayment {
  constructor({
    paymentRepository,
    notificationRepository,
    redisClient,
    eventPublisher,
  }) {
    this.paymentRepository = paymentRepository;
    this.notificationRepository = notificationRepository;
    this.redisClient = redisClient;
    this.eventPublisher = eventPublisher;
  }

  async execute({ amount, currency, accountId, email, description, idempotencyKey }) {
    logger.info(`Iniciando creación de pago`, { idempotencyKey, accountId });

    // 1. ADQUIRIR LOCK DISTRIBUIDO
    // Evita que dos requests con la misma idempotencyKey se procesen simultáneamente
    const lockName = `payment:${idempotencyKey}`;
    
    return await this.redisClient.withLock(lockName, async () => {
      
      // 2. VERIFICAR IDEMPOTENCIA
      logger.debug(`Verificando idempotencia`, { idempotencyKey });
      const existingResult = await this.redisClient.getIdempotencyKey(idempotencyKey);
      
      if (existingResult) {
        logger.info(`Pago ya procesado anteriormente (idempotente)`, { 
          idempotencyKey, 
          paymentId: existingResult.id 
        });
        return existingResult;
      }

      // 3. CREAR ENTIDAD PAYMENT
      const paymentId = generatePaymentId();
      logger.debug(`Creando entidad Payment`, { paymentId });
      
      const payment = new Payment({
        id: paymentId,
        amount,
        currency,
        accountId,
        email,
        description,
        idempotencyKey,
      });

      // 4. CREAR ENTIDAD NOTIFICATION
      const notificationId = generateNotificationId();
      logger.debug(`Creando entidad Notification`, { notificationId, paymentId });
      
      const notification = new Notification({
        id: notificationId,
        paymentId: payment.id,
        type: NotificationType.EMAIL,
        recipient: email,
      });

      // 5. PERSISTIR PAYMENT
      logger.debug(`Guardando payment en base de datos`);
      await this.paymentRepository.save(payment);

      // 6. PERSISTIR NOTIFICATION
      logger.debug(`Guardando notification en base de datos`);
      await this.notificationRepository.save(notification);

      // 7. PUBLICAR EVENTO A RABBITMQ
      const event = {
        id: `evt_${Date.now()}`,
        type: 'payment.success',
        timestamp: new Date().toISOString(),
        payload: {
          paymentId: payment.id,
          notificationId: notification.id,
          amount: payment.amount,
          currency: payment.currency,
          accountId: payment.accountId,
          email: payment.email,
        },
      };

      logger.debug(`Publicando evento payment.success`, { eventId: event.id });
      await this.eventPublisher.publish(event);

      // 8. GUARDAR RESULTADO EN REDIS PARA IDEMPOTENCIA
      const result = payment.toJSON();
      await this.redisClient.setIdempotencyKey(idempotencyKey, result);

      logger.info(`Pago creado exitosamente`, { 
        paymentId: payment.id, 
        notificationId: notification.id,
        amount: payment.amount,
        currency: payment.currency,
      });

      return result;

    }, 10000, 5000); // lock TTL: 10s, max wait: 5s
  }
}

module.exports = CreatePayment;