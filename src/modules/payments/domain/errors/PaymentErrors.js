class PaymentError extends Error {
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

class InvalidAmountError extends PaymentError {
  constructor(message = 'Monto inválido') {
    super(message, 'INVALID_AMOUNT', 400);
  }
}

class InvalidCurrencyError extends PaymentError {
  constructor(message = 'Moneda inválida') {
    super(message, 'INVALID_CURRENCY', 400);
  }
}

class InvalidAccountError extends PaymentError {
  constructor(message = 'Cuenta inválida') {
    super(message, 'INVALID_ACCOUNT', 400);
  }
}

class InvalidEmailError extends PaymentError {
  constructor(message = 'Email inválido') {
    super(message, 'INVALID_EMAIL', 400);
  }
}

class InvalidDescriptionError extends PaymentError {
  constructor(message = 'Descripción inválida') {
    super(message, 'INVALID_DESCRIPTION', 400);
  }
}

class IdempotencyKeyRequiredError extends PaymentError {
  constructor(message = 'La clave de idempotencia es requerida') {
    super(message, 'IDEMPOTENCY_KEY_REQUIRED', 400);
  }
}

class PaymentNotFoundError extends PaymentError {
  constructor(paymentId) {
    super(`Pago no encontrado: ${paymentId}`, 'PAYMENT_NOT_FOUND', 404);
    this.paymentId = paymentId;
  }
}

class DuplicatePaymentError extends PaymentError {
  constructor(idempotencyKey) {
    super(`Ya existe un pago con esta clave de idempotencia`, 'DUPLICATE_PAYMENT', 409);
    this.idempotencyKey = idempotencyKey;
  }
}

class PaymentProcessingError extends PaymentError {
  constructor(message = 'Error procesando el pago') {
    super(message, 'PAYMENT_PROCESSING_ERROR', 500);
  }
}

module.exports = {
  PaymentError,
  InvalidAmountError,
  InvalidCurrencyError,
  InvalidAccountError,
  InvalidEmailError,
  InvalidDescriptionError,
  IdempotencyKeyRequiredError,
  PaymentNotFoundError,
  DuplicatePaymentError,
  PaymentProcessingError,
};