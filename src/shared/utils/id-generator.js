const { v4: uuidv4 } = require('uuid');

const PREFIXES = {
  PAYMENT: 'pay',
  NOTIFICATION: 'ntf',
};

/**
 * Genera un ID único con prefijo
 * Formato: prefix_xxxxxxxxxxxx (12 caracteres aleatorios)
 * Ejemplo: pay_a1b2c3d4e5f6
 */
function generateId(prefix) {
  const uuid = uuidv4().replace(/-/g, '');
  const shortId = uuid.substring(0, 12);
  return `${prefix}_${shortId}`;
}

function generatePaymentId() {
  return generateId(PREFIXES.PAYMENT);
}

function generateNotificationId() {
  return generateId(PREFIXES.NOTIFICATION);
}

module.exports = {
  PREFIXES,
  generateId,
  generatePaymentId,
  generateNotificationId,
};