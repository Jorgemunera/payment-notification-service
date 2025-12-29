const PaymentErrors = require('../../domain/errors/PaymentErrors');
const { Logger } = require('../../../../shared/utils/logger');

const logger = new Logger('USE-CASE:GET-PAYMENT');

class GetPayment {
  constructor({
    paymentRepository,
    notificationRepository,
  }) {
    this.paymentRepository = paymentRepository;
    this.notificationRepository = notificationRepository;
  }

  async execute({ paymentId }) {
    logger.info(`Buscando pago`, { paymentId });

    // 1. BUSCAR PAYMENT
    const payment = await this.paymentRepository.findById(paymentId);

    if (!payment) {
      logger.warn(`Pago no encontrado`, { paymentId });
      throw new PaymentErrors.PaymentNotFoundError(paymentId);
    }

    // 2. BUSCAR NOTIFICATION ASOCIADA
    const notification = await this.notificationRepository.findByPaymentId(paymentId);

    // 3. CONSTRUIR RESPUESTA
    const result = {
      ...payment.toJSON(),
      notification: notification ? notification.toJSON() : null,
    };

    logger.info(`Pago encontrado`, { 
      paymentId, 
      status: payment.status,
      notificationStatus: notification?.status || 'N/A',
    });

    return result;
  }
}

module.exports = GetPayment;