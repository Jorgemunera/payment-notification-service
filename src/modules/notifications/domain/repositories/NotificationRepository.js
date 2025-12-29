/**
 * Interface para el repositorio de notificaciones
 * Define los métodos que debe implementar cualquier persistencia
 */
class NotificationRepository {
  /**
   * Guarda una nueva notificación
   * @param {Notification} notification - Entidad de notificación a guardar
   * @returns {Promise<Notification>} - Notificación guardada
   */
  async save(notification) {
    throw new Error('Método save() debe ser implementado');
  }

  /**
   * Busca una notificación por su ID
   * @param {string} id - ID de la notificación
   * @returns {Promise<Notification|null>} - Notificación encontrada o null
   */
  async findById(id) {
    throw new Error('Método findById() debe ser implementado');
  }

  /**
   * Busca una notificación por paymentId
   * @param {string} paymentId - ID del pago
   * @returns {Promise<Notification|null>} - Notificación encontrada o null
   */
  async findByPaymentId(paymentId) {
    throw new Error('Método findByPaymentId() debe ser implementado');
  }

  /**
   * Busca notificaciones con filtros
   * @param {object} filters - Filtros de búsqueda
   * @param {string} filters.status - Estado de la notificación
   * @param {string} filters.paymentId - ID del pago
   * @param {object} options - Opciones de paginación
   * @param {number} options.limit - Límite de resultados
   * @param {number} options.offset - Offset para paginación
   * @returns {Promise<{notifications: Notification[], total: number}>} - Lista de notificaciones y total
   */
  async findAll(filters = {}, options = {}) {
    throw new Error('Método findAll() debe ser implementado');
  }

  /**
   * Actualiza una notificación
   * @param {Notification} notification - Entidad de notificación a actualizar
   * @returns {Promise<Notification>} - Notificación actualizada
   */
  async update(notification) {
    throw new Error('Método update() debe ser implementado');
  }

  /**
   * Cuenta notificaciones por estado
   * @returns {Promise<object>} - Conteo por estado
   */
  async countByStatus() {
    throw new Error('Método countByStatus() debe ser implementado');
  }
}

module.exports = NotificationRepository;