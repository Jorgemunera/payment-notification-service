class NotificationError extends Error {
  constructor(message, code, statusCode = 400) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
      },
    };
  }
}

class InvalidPaymentIdError extends NotificationError {
  constructor(message = 'PaymentId inválido') {
    super(message, 'INVALID_PAYMENT_ID', 400);
  }
}

class InvalidNotificationTypeError extends NotificationError {
  constructor(message = 'Tipo de notificación inválido') {
    super(message, 'INVALID_NOTIFICATION_TYPE', 400);
  }
}

class InvalidRecipientError extends NotificationError {
  constructor(message = 'Destinatario inválido') {
    super(message, 'INVALID_RECIPIENT', 400);
  }
}

class InvalidStatusError extends NotificationError {
  constructor(message = 'Estado inválido') {
    super(message, 'INVALID_STATUS', 400);
  }
}

class NotificationNotFoundError extends NotificationError {
  constructor(notificationId) {
    super(`Notificación no encontrada: ${notificationId}`, 'NOTIFICATION_NOT_FOUND', 404);
    this.notificationId = notificationId;
  }
}

class NotificationAlreadySentError extends NotificationError {
  constructor(notificationId) {
    super(`La notificación ya fue enviada: ${notificationId}`, 'NOTIFICATION_ALREADY_SENT', 409);
    this.notificationId = notificationId;
  }
}

class NotificationServiceUnavailableError extends NotificationError {
  constructor(message = 'El servicio de notificaciones no está disponible') {
    super(message, 'NOTIFICATION_SERVICE_UNAVAILABLE', 503);
  }
}

class NotificationSendError extends NotificationError {
  constructor(message = 'Error enviando la notificación') {
    super(message, 'NOTIFICATION_SEND_ERROR', 500);
  }
}

class DeadLetterMessageNotFoundError extends NotificationError {
  constructor(messageId) {
    super(`Mensaje no encontrado en DLQ: ${messageId}`, 'DLQ_MESSAGE_NOT_FOUND', 404);
    this.messageId = messageId;
  }
}

module.exports = {
  NotificationError,
  InvalidPaymentIdError,
  InvalidNotificationTypeError,
  InvalidRecipientError,
  InvalidStatusError,
  NotificationNotFoundError,
  NotificationAlreadySentError,
  NotificationServiceUnavailableError,
  NotificationSendError,
  DeadLetterMessageNotFoundError,
};