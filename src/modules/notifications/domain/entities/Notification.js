const NotificationErrors = require('../errors/NotificationErrors');

// Estados posibles de una notificación
const NotificationStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  SENT: 'SENT',
  FAILED: 'FAILED',
  RETRIED: 'RETRIED',
};

// Tipos de notificación
const NotificationType = {
  EMAIL: 'EMAIL',
};

class Notification {
  constructor({
    id,
    paymentId,
    type,
    recipient,
    status,
    attempts,
    lastAttemptAt,
    sentAt,
    errorMessage,
    createdAt,
    updatedAt,
  }) {
    this.id = id;
    this.paymentId = paymentId;
    this.type = type || NotificationType.EMAIL;
    this.recipient = recipient;
    this.status = status || NotificationStatus.PENDING;
    this.attempts = attempts || 0;
    this.lastAttemptAt = lastAttemptAt || null;
    this.sentAt = sentAt || null;
    this.errorMessage = errorMessage || null;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();

    this._validate();
  }

  _validate() {
    // Validar paymentId
    if (!this.paymentId || typeof this.paymentId !== 'string' || this.paymentId.trim() === '') {
      throw new NotificationErrors.InvalidPaymentIdError('El paymentId es requerido');
    }

    // Validar type
    if (!Object.values(NotificationType).includes(this.type)) {
      throw new NotificationErrors.InvalidNotificationTypeError(
        `Tipo de notificación no válido: ${this.type}. Permitidos: ${Object.values(NotificationType).join(', ')}`
      );
    }

    // Validar recipient
    if (!this.recipient || typeof this.recipient !== 'string' || this.recipient.trim() === '') {
      throw new NotificationErrors.InvalidRecipientError('El destinatario es requerido');
    }

    // Validar formato de email si el tipo es EMAIL
    if (this.type === NotificationType.EMAIL) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.recipient)) {
        throw new NotificationErrors.InvalidRecipientError('El email del destinatario no tiene un formato válido');
      }
    }

    // Validar status
    if (!Object.values(NotificationStatus).includes(this.status)) {
      throw new NotificationErrors.InvalidStatusError(
        `Estado no válido: ${this.status}. Permitidos: ${Object.values(NotificationStatus).join(', ')}`
      );
    }
  }

  /**
   * Marca la notificación como en proceso
   */
  markAsProcessing() {
    this.status = NotificationStatus.PROCESSING;
    this.attempts += 1;
    this.lastAttemptAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Marca la notificación como enviada
   */
  markAsSent() {
    this.status = NotificationStatus.SENT;
    this.sentAt = new Date();
    this.updatedAt = new Date();
    this.errorMessage = null;
  }

  /**
   * Marca la notificación como fallida
   * @param {string} errorMessage - Mensaje de error
   */
  markAsFailed(errorMessage) {
    this.status = NotificationStatus.FAILED;
    this.errorMessage = errorMessage;
    this.updatedAt = new Date();
  }

  /**
   * Marca la notificación como reintentada (desde DLQ)
   */
  markAsRetried() {
    this.status = NotificationStatus.RETRIED;
    this.updatedAt = new Date();
  }

  /**
   * Resetea la notificación para reintento desde DLQ
   */
  resetForRetry() {
    this.status = NotificationStatus.PENDING;
    this.errorMessage = null;
    this.updatedAt = new Date();
  }

  /**
   * Verifica si la notificación puede ser procesada
   */
  canBeProcessed() {
    return this.status === NotificationStatus.PENDING || this.status === NotificationStatus.RETRIED;
  }

  /**
   * Verifica si la notificación ya fue enviada
   */
  isSent() {
    return this.status === NotificationStatus.SENT;
  }

  /**
   * Verifica si la notificación falló
   */
  isFailed() {
    return this.status === NotificationStatus.FAILED;
  }

  /**
   * Convierte la entidad a un objeto plano para persistencia
   */
  toPersistence() {
    return {
      id: this.id,
      payment_id: this.paymentId,
      type: this.type,
      recipient: this.recipient,
      status: this.status,
      attempts: this.attempts,
      last_attempt_at: this.lastAttemptAt,
      sent_at: this.sentAt,
      error_message: this.errorMessage,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
    };
  }

  /**
   * Convierte la entidad a JSON para respuestas API
   */
  toJSON() {
    return {
      id: this.id,
      paymentId: this.paymentId,
      type: this.type,
      recipient: this.recipient,
      status: this.status,
      attempts: this.attempts,
      lastAttemptAt: this.lastAttemptAt ? this.lastAttemptAt.toISOString() : null,
      sentAt: this.sentAt ? this.sentAt.toISOString() : null,
      errorMessage: this.errorMessage,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }

  /**
   * Crea una instancia de Notification desde un registro de base de datos
   */
  static fromPersistence(row) {
    return new Notification({
      id: row.id,
      paymentId: row.payment_id,
      type: row.type,
      recipient: row.recipient,
      status: row.status,
      attempts: row.attempts,
      lastAttemptAt: row.last_attempt_at ? new Date(row.last_attempt_at) : null,
      sentAt: row.sent_at ? new Date(row.sent_at) : null,
      errorMessage: row.error_message,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }
}

module.exports = {
  Notification,
  NotificationStatus,
  NotificationType,
};