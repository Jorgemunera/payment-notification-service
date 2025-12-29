const NotificationRepository = require('../../domain/repositories/NotificationRepository');
const { Notification } = require('../../domain/entities/Notification');
const { query } = require('../../../../shared/infrastructure/database/postgres');
const { Logger } = require('../../../../shared/utils/logger');

const logger = new Logger('REPO:NOTIFICATION');

class PostgresNotificationRepository extends NotificationRepository {
  async save(notification) {
    logger.debug(`Guardando notification`, { notificationId: notification.id });

    const data = notification.toPersistence();

    const sql = `
      INSERT INTO notifications (
        id, payment_id, type, recipient, status, attempts,
        last_attempt_at, sent_at, error_message, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      data.id,
      data.payment_id,
      data.type,
      data.recipient,
      data.status,
      data.attempts,
      data.last_attempt_at,
      data.sent_at,
      data.error_message,
      data.created_at,
      data.updated_at,
    ];

    const result = await query(sql, values);

    logger.debug(`Notification guardada`, { notificationId: notification.id });

    return Notification.fromPersistence(result.rows[0]);
  }

  async findById(id) {
    logger.debug(`Buscando notification por ID`, { notificationId: id });

    const sql = `SELECT * FROM notifications WHERE id = $1`;
    const result = await query(sql, [id]);

    if (result.rows.length === 0) {
      logger.debug(`Notification no encontrada`, { notificationId: id });
      return null;
    }

    return Notification.fromPersistence(result.rows[0]);
  }

  async findByPaymentId(paymentId) {
    logger.debug(`Buscando notification por payment ID`, { paymentId });

    const sql = `SELECT * FROM notifications WHERE payment_id = $1`;
    const result = await query(sql, [paymentId]);

    if (result.rows.length === 0) {
      logger.debug(`Notification no encontrada para payment`, { paymentId });
      return null;
    }

    return Notification.fromPersistence(result.rows[0]);
  }

  async findAll(filters = {}, options = {}) {
    const { limit = 50, offset = 0 } = options;
    const conditions = [];
    const values = [];
    let paramIndex = 1;

    if (filters.status) {
      conditions.push(`status = $${paramIndex}`);
      values.push(filters.status);
      paramIndex++;
    }

    if (filters.paymentId) {
      conditions.push(`payment_id = $${paramIndex}`);
      values.push(filters.paymentId);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}` 
      : '';

    // Query para obtener notificaciones
    const sql = `
      SELECT * FROM notifications 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    values.push(limit, offset);

    const result = await query(sql, values);

    // Query para contar total
    const countValues = values.slice(0, -2); // Sin limit y offset
    const countSql = `
      SELECT COUNT(*) as total FROM notifications ${whereClause}
    `;
    const countResult = await query(countSql, countValues);
    const total = parseInt(countResult.rows[0].total, 10);

    logger.debug(`Notifications encontradas`, { count: result.rows.length, total });

    return {
      notifications: result.rows.map(row => Notification.fromPersistence(row)),
      total,
    };
  }

  async update(notification) {
    logger.debug(`Actualizando notification`, { notificationId: notification.id });

    const data = notification.toPersistence();

    const sql = `
      UPDATE notifications
      SET status = $1,
          attempts = $2,
          last_attempt_at = $3,
          sent_at = $4,
          error_message = $5,
          updated_at = $6
      WHERE id = $7
      RETURNING *
    `;

    const values = [
      data.status,
      data.attempts,
      data.last_attempt_at,
      data.sent_at,
      data.error_message,
      new Date(),
      data.id,
    ];

    const result = await query(sql, values);

    logger.debug(`Notification actualizada`, { 
      notificationId: notification.id,
      status: data.status,
    });

    return Notification.fromPersistence(result.rows[0]);
  }

  async countByStatus() {
    logger.debug(`Contando notifications por status`);

    const sql = `
      SELECT status, COUNT(*) as count
      FROM notifications
      GROUP BY status
    `;

    const result = await query(sql, []);

    const counts = {
      PENDING: 0,
      PROCESSING: 0,
      SENT: 0,
      FAILED: 0,
      RETRIED: 0,
    };

    result.rows.forEach(row => {
      counts[row.status] = parseInt(row.count, 10);
    });

    return counts;
  }
}

module.exports = PostgresNotificationRepository;