const Joi = require('joi');
const { NotificationStatus } = require('../../domain/entities/Notification');

const getNotificationsQuerySchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(NotificationStatus))
    .optional()
    .messages({
      'any.only': `El status debe ser uno de: ${Object.values(NotificationStatus).join(', ')}`,
    }),

  paymentId: Joi.string()
    .trim()
    .pattern(/^pay_[a-z0-9]+$/)
    .optional()
    .messages({
      'string.pattern.base': 'El paymentId no tiene un formato válido',
    }),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(50)
    .messages({
      'number.min': 'El límite debe ser al menos 1',
      'number.max': 'El límite no puede exceder 100',
    }),

  offset: Joi.number()
    .integer()
    .min(0)
    .default(0)
    .messages({
      'number.min': 'El offset no puede ser negativo',
    }),
});

const retryMessageParamsSchema = Joi.object({
  messageId: Joi.string()
    .trim()
    .min(1)
    .required()
    .messages({
      'string.empty': 'El messageId es requerido',
      'any.required': 'El messageId es requerido',
    }),
});

const maxMessagesQuerySchema = Joi.object({
  maxMessages: Joi.number()
    .integer()
    .min(1)
    .max(1000)
    .default(100)
    .messages({
      'number.min': 'maxMessages debe ser al menos 1',
      'number.max': 'maxMessages no puede exceder 1000',
    }),
});

function validateGetNotifications(req, res, next) {
  const validation = getNotificationsQuerySchema.validate(req.query, { abortEarly: false });
  
  if (validation.error) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: validation.error.details[0].message,
        details: validation.error.details.map(d => ({
          field: d.path.join('.'),
          message: d.message,
        })),
      },
    });
  }

  req.query = validation.value;
  next();
}

function validateRetryMessage(req, res, next) {
  const validation = retryMessageParamsSchema.validate(req.params);
  
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

function validateMaxMessages(req, res, next) {
  const validation = maxMessagesQuerySchema.validate(req.query);
  
  if (validation.error) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: validation.error.details[0].message,
      },
    });
  }

  req.query = validation.value;
  next();
}

module.exports = {
  getNotificationsQuerySchema,
  retryMessageParamsSchema,
  maxMessagesQuerySchema,
  validateGetNotifications,
  validateRetryMessage,
  validateMaxMessages,
};