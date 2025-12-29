const config = require('../../../../config');
const { Logger } = require('../../../../shared/utils/logger');
const NotificationErrors = require('../../domain/errors/NotificationErrors');

const logger = new Logger('SERVICE:EMAIL');

class EmailService {
  constructor() {
    this.enabled = config.notifications.serviceEnabled;
  }

  /**
   * Verifica si el servicio está habilitado
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Habilita el servicio (para simulación)
   */
  enable() {
    this.enabled = true;
    logger.info('Servicio de email HABILITADO');
  }

  /**
   * Deshabilita el servicio (para simulación de fallo)
   */
  disable() {
    this.enabled = false;
    logger.warn('Servicio de email DESHABILITADO');
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

    // Verificar si el servicio está habilitado
    if (!this.enabled) {
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
  getStatus() {
    return {
      service: 'email',
      enabled: this.enabled,
      status: this.enabled ? 'operational' : 'unavailable',
    };
  }
}

module.exports = EmailService;