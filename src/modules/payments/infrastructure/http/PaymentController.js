const { Logger } = require('../../../../shared/utils/logger');

const logger = new Logger('CONTROLLER:PAYMENT');

class PaymentController {
  constructor({ createPaymentUseCase, getPaymentUseCase }) {
    this.createPaymentUseCase = createPaymentUseCase;
    this.getPaymentUseCase = getPaymentUseCase;
  }

  async create(req, res, next) {
    try {
      const { amount, currency, accountId, email, description } = req.body;
      const idempotencyKey = req.headers['idempotency-key'];

      logger.info(`Recibida solicitud de creación de pago`, {
        idempotencyKey,
        accountId,
        amount,
        currency,
      });

      const payment = await this.createPaymentUseCase.execute({
        amount,
        currency,
        accountId,
        email,
        description,
        idempotencyKey,
      });

      logger.info(`Pago creado/recuperado exitosamente`, {
        paymentId: payment.id,
        idempotencyKey,
      });

      res.status(201).json(payment);

    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const { id } = req.params;

      logger.info(`Recibida solicitud de consulta de pago`, { paymentId: id });

      const payment = await this.getPaymentUseCase.execute({ paymentId: id });

      logger.info(`Pago encontrado`, { paymentId: id });

      res.status(200).json(payment);

    } catch (error) {
      next(error);
    }
  }
}

module.exports = PaymentController;