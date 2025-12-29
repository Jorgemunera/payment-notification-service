const PaymentErrors = require('../errors/PaymentErrors');

// Estados posibles de un pago
const PaymentStatus = {
  SUCCESS: 'SUCCESS',
};

// Monedas permitidas
const AllowedCurrencies = ['COP', 'USD'];

class Payment {
  constructor({ id, amount, currency, accountId, email, description, status, idempotencyKey, createdAt, updatedAt }) {
    this.id = id;
    this.amount = amount;
    this.currency = currency || 'COP';
    this.accountId = accountId;
    this.email = email;
    this.description = description || null;
    this.status = status || PaymentStatus.SUCCESS;
    this.idempotencyKey = idempotencyKey;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();

    this._validate();
  }

  _validate() {
    // Validar amount
    if (this.amount === undefined || this.amount === null) {
      throw new PaymentErrors.InvalidAmountError('El monto es requerido');
    }

    if (typeof this.amount !== 'number' || isNaN(this.amount)) {
      throw new PaymentErrors.InvalidAmountError('El monto debe ser un número');
    }

    if (this.amount <= 0) {
      throw new PaymentErrors.InvalidAmountError('El monto debe ser mayor a cero');
    }

    // Validar máximo 2 decimales
    const decimalPlaces = (this.amount.toString().split('.')[1] || '').length;
    if (decimalPlaces > 2) {
      throw new PaymentErrors.InvalidAmountError('El monto no puede tener más de 2 decimales');
    }

    // Validar currency
    if (!AllowedCurrencies.includes(this.currency)) {
      throw new PaymentErrors.InvalidCurrencyError(`Moneda no permitida: ${this.currency}. Permitidas: ${AllowedCurrencies.join(', ')}`);
    }

    // Validar accountId
    if (!this.accountId || typeof this.accountId !== 'string' || this.accountId.trim() === '') {
      throw new PaymentErrors.InvalidAccountError('El accountId es requerido');
    }

    // Validar email
    if (!this.email || typeof this.email !== 'string' || this.email.trim() === '') {
      throw new PaymentErrors.InvalidEmailError('El email es requerido');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      throw new PaymentErrors.InvalidEmailError('El email no tiene un formato válido');
    }

    // Validar idempotencyKey
    if (!this.idempotencyKey || typeof this.idempotencyKey !== 'string' || this.idempotencyKey.trim() === '') {
      throw new PaymentErrors.IdempotencyKeyRequiredError('La clave de idempotencia es requerida');
    }

    // Validar description (opcional pero con límite)
    if (this.description && this.description.length > 255) {
      throw new PaymentErrors.InvalidDescriptionError('La descripción no puede exceder 255 caracteres');
    }
  }

  /**
   * Convierte la entidad a un objeto plano para persistencia
   */
  toPersistence() {
    return {
      id: this.id,
      amount: this.amount,
      currency: this.currency,
      account_id: this.accountId,
      email: this.email,
      description: this.description,
      status: this.status,
      idempotency_key: this.idempotencyKey,
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
      amount: this.amount,
      currency: this.currency,
      accountId: this.accountId,
      email: this.email,
      description: this.description,
      status: this.status,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }

  /**
   * Crea una instancia de Payment desde un registro de base de datos
   */
  static fromPersistence(row) {
    return new Payment({
      id: row.id,
      amount: parseFloat(row.amount),
      currency: row.currency,
      accountId: row.account_id,
      email: row.email,
      description: row.description,
      status: row.status,
      idempotencyKey: row.idempotency_key,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }
}

module.exports = {
  Payment,
  PaymentStatus,
  AllowedCurrencies,
};