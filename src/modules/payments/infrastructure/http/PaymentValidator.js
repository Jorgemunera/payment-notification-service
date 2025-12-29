const Joi = require('joi');

const createPaymentSchema = Joi.object({
  amount: Joi.number()
    .positive()
    .precision(2)
    .required()
    .messages({
      'number.base': 'El monto debe ser un número',
      'number.positive': 'El monto debe ser mayor a cero',
      'number.precision': 'El monto no puede tener más de 2 decimales',
      'any.required': 'El monto es requerido',
    }),

  currency: Joi.string()
    .valid('COP', 'USD')
    .default('COP')
    .messages({
      'any.only': 'La moneda debe ser COP o USD',
    }),

  accountId: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .required()
    .messages({
      'string.empty': 'El accountId es requerido',
      'string.max': 'El accountId no puede exceder 50 caracteres',
      'any.required': 'El accountId es requerido',
    }),

  email: Joi.string()
    .trim()
    .email()
    .max(255)
    .required()
    .messages({
      'string.empty': 'El email es requerido',
      'string.email': 'El email no tiene un formato válido',
      'string.max': 'El email no puede exceder 255 caracteres',
      'any.required': 'El email es requerido',
    }),

  description: Joi.string()
    .trim()
    .max(255)
    .allow(null, '')
    .optional()
    .messages({
      'string.max': 'La descripción no puede exceder 255 caracteres',
    }),
});

const getPaymentParamsSchema = Joi.object({
  id: Joi.string()
    .trim()
    .pattern(/^pay_[a-z0-9]+$/)
    .required()
    .messages({
      'string.pattern.base': 'El ID del pago no tiene un formato válido',
      'any.required': 'El ID del pago es requerido',
    }),
});

const idempotencyKeyHeaderSchema = Joi.object({
  'idempotency-key': Joi.string()
    .trim()
    .min(1)
    .max(255)
    .required()
    .messages({
      'string.empty': 'El header Idempotency-Key es requerido',
      'string.max': 'El header Idempotency-Key no puede exceder 255 caracteres',
      'any.required': 'El header Idempotency-Key es requerido',
    }),
}).unknown(true);

function validateCreatePayment(req, res, next) {
  // Validar header Idempotency-Key
  const headerValidation = idempotencyKeyHeaderSchema.validate(req.headers);
  if (headerValidation.error) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: headerValidation.error.details[0].message,
      },
    });
  }

  // Validar body
  const bodyValidation = createPaymentSchema.validate(req.body, { abortEarly: false });
  if (bodyValidation.error) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: bodyValidation.error.details[0].message,
        details: bodyValidation.error.details.map(d => ({
          field: d.path.join('.'),
          message: d.message,
        })),
      },
    });
  }

  req.body = bodyValidation.value;
  next();
}

function validateGetPayment(req, res, next) {
  const validation = getPaymentParamsSchema.validate(req.params);
  if (validation.error) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: validation.error.details[0].message,
      },
    });
  }

  req.params = validation.value;
  next();
}

module.exports = {
  createPaymentSchema,
  getPaymentParamsSchema,
  idempotencyKeyHeaderSchema,
  validateCreatePayment,
  validateGetPayment,
};