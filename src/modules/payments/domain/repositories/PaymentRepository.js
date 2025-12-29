/**
 * Interface para el repositorio de pagos
 * Define los métodos que debe implementar cualquier persistencia
 */
class PaymentRepository {
  /**
   * Guarda un nuevo pago
   * @param {Payment} payment - Entidad de pago a guardar
   * @returns {Promise<Payment>} - Pago guardado
   */
  async save(payment) {
    throw new Error('Método save() debe ser implementado');
  }

  /**
   * Busca un pago por su ID
   * @param {string} id - ID del pago
   * @returns {Promise<Payment|null>} - Pago encontrado o null
   */
  async findById(id) {
    throw new Error('Método findById() debe ser implementado');
  }

  /**
   * Busca un pago por su clave de idempotencia
   * @param {string} idempotencyKey - Clave de idempotencia
   * @returns {Promise<Payment|null>} - Pago encontrado o null
   */
  async findByIdempotencyKey(idempotencyKey) {
    throw new Error('Método findByIdempotencyKey() debe ser implementado');
  }

  /**
   * Busca pagos por accountId
   * @param {string} accountId - ID de la cuenta
   * @param {object} options - Opciones de paginación
   * @returns {Promise<Payment[]>} - Lista de pagos
   */
  async findByAccountId(accountId, options = {}) {
    throw new Error('Método findByAccountId() debe ser implementado');
  }
}

module.exports = PaymentRepository;