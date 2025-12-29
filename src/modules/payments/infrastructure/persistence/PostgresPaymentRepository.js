const PaymentRepository = require('../../domain/repositories/PaymentRepository');
const { Payment } = require('../../domain/entities/Payment');
const { query } = require('../../../../shared/infrastructure/database/postgres');
const { Logger } = require('../../../../shared/utils/logger');

const logger = new Logger('REPO:PAYMENT');

class PostgresPaymentRepository extends PaymentRepository {
  async save(payment) {
    logger.debug(`Guardando payment`, { paymentId: payment.id });

    const data = payment.toPersistence();
    
    const sql = `
      INSERT INTO payments (
        id, amount, currency, account_id, email, description, 
        status, idempotency_key, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      data.id,
      data.amount,
      data.currency,
      data.account_id,
      data.email,
      data.description,
      data.status,
      data.idempotency_key,
      data.created_at,
      data.updated_at,
    ];

    const result = await query(sql, values);
    
    logger.debug(`Payment guardado`, { paymentId: payment.id });
    
    return Payment.fromPersistence(result.rows[0]);
  }

  async findById(id) {
    logger.debug(`Buscando payment por ID`, { paymentId: id });

    const sql = `SELECT * FROM payments WHERE id = $1`;
    const result = await query(sql, [id]);

    if (result.rows.length === 0) {
      logger.debug(`Payment no encontrado`, { paymentId: id });
      return null;
    }

    return Payment.fromPersistence(result.rows[0]);
  }

  async findByIdempotencyKey(idempotencyKey) {
    logger.debug(`Buscando payment por idempotency key`, { idempotencyKey });

    const sql = `SELECT * FROM payments WHERE idempotency_key = $1`;
    const result = await query(sql, [idempotencyKey]);

    if (result.rows.length === 0) {
      logger.debug(`Payment no encontrado por idempotency key`, { idempotencyKey });
      return null;
    }

    return Payment.fromPersistence(result.rows[0]);
  }

  async findByAccountId(accountId, options = {}) {
    const { limit = 50, offset = 0 } = options;
    
    logger.debug(`Buscando payments por account ID`, { accountId, limit, offset });

    const sql = `
      SELECT * FROM payments 
      WHERE account_id = $1 
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await query(sql, [accountId, limit, offset]);

    return result.rows.map(row => Payment.fromPersistence(row));
  }
}

module.exports = PostgresPaymentRepository;