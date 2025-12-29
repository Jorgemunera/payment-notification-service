const config = require('../../../../config');
const { Logger } = require('../../../../shared/utils/logger');
const { redis } = require('../../../../shared/infrastructure/cache/redis');
const NotificationErrors = require('../../domain/errors/NotificationErrors');

const logger = new Logger('SERVICE:EMAIL');

// Clave en Redis para el estado del servicio
const SERVICE_STATUS_KEY = 'notification:service:enabled';

class EmailService {
  constructor() {
    // Inicializar el estado en Redis si no existe
    this._initializeStatus();
  }

  /**
   * Inicializa el estado del servicio en Redis
   */
  async _initializeStatus() {
    try {
      const currentStatus = await redis.get(SERVICE_STATUS_KEY);
      
      if (currentStatus === null) {
        // No existe, establecer valor inicial desde config
        const initialValue = config.notifications.serviceEnabled ? 'true' : 'false';
        await redis.set(SERVICE_STATUS_KEY, initialValue);
        logger.info(`Estado inicial del servicio establecido en Redis: ${initialValue}`);
      }
    } catch (error) {
      logger.error('Error inicializando estado del servicio en Redis', { error: error.message });
    }
  }

  /**
   * Verifica si el servicio está habilitado (consulta Redis)
   */
  async isEnabled() {
    try {
      const status = await redis.get(SERVICE_STATUS_KEY);
      return status === 'true';
    } catch (error) {
      logger.error('Error consultando estado del servicio', { error: error.message });
      // En caso de error de Redis, usar config como fallback
      return config.notifications.serviceEnabled;
    }
  }

  /**
   * Habilita el servicio (para simulación)
   */
  async enable() {
    await redis.set(SERVICE_STATUS_KEY, 'true');
    logger.info('Servicio de email HABILITADO (Redis actualizado)');
  }

  /**
   * Deshabilita el servicio (para simulación de fallo)
   */
  async disable() {
    await redis.set(SERVICE_STATUS_KEY, 'false');
    logger.warn('Servicio de email DESHABILITADO (Redis actualizado)');
  }

  /**
   * Simula el envío de un email
   * @param {string} to - Destinatario
   * @param {string} subject - Asunto
   * @param {string} body - Cuerpo del mensaje
   */
  async send({ to, subject, body }) {
    logger.info(`Intentando enviar email`, { to, subject });

    // Simular latencia de red
    await this._simulateLatency();

    // Verificar si el servicio está habilitado (CONSULTA A REDIS)
    const enabled = await this.isEnabled();
    
    if (!enabled) {
      logger.error(`Servicio de email no disponible`, { to, subject });
      throw new NotificationErrors.NotificationServiceUnavailableError(
        'El servicio de email no está disponible'
      );
    }

    // Simular envío exitoso
    logger.info(`═══════════════════════════════════════════════════════════`);
    logger.info(`📧 EMAIL ENVIADO EXITOSAMENTE`);
    logger.info(`───────────────────────────────────────────────────────────`);
    logger.info(`   To:      ${to}`);
    logger.info(`   Subject: ${subject}`);
    logger.info(`   Body:    ${body}`);
    logger.info(`═══════════════════════════════════════════════════════════`);

    return {
      success: true,
      to,
      subject,
      sentAt: new Date().toISOString(),
    };
  }

  /**
   * Simula latencia de red (100-300ms)
   */
  async _simulateLatency() {
    const latency = Math.floor(Math.random() * 200) + 100;
    await new Promise(resolve => setTimeout(resolve, latency));
  }

  /**
   * Obtiene el estado actual del servicio
   */
  async getStatus() {
    const enabled = await this.isEnabled();
    return {
      service: 'email',
      enabled: enabled,
      status: enabled ? 'operational' : 'unavailable',
    };
  }
}

module.exports = EmailService;