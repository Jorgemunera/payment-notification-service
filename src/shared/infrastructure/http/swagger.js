const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const config = require('../../../config');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Payment Notification Service API',
      version: '1.0.0',
      description: `
## Descripción

Servicio de pagos con notificaciones asíncronas usando RabbitMQ.

### Características principales:

- **Pagos idempotentes**: Cada pago requiere una clave de idempotencia para evitar duplicados
- **Notificaciones asíncronas**: Las notificaciones se procesan en un worker separado
- **Resiliencia**: Si el servicio de notificaciones falla, los mensajes se reintentan automáticamente
- **Dead Letter Queue**: Los mensajes que fallan después de múltiples reintentos van a una cola especial para revisión

### Flujo de un pago:

1. Cliente envía POST /payments con Idempotency-Key header
2. Se crea el pago con estado SUCCESS
3. Se encola un evento para enviar notificación por email
4. El worker procesa la notificación de forma asíncrona
5. Si falla, se reintenta con backoff exponencial (1s, 2s, 4s)
6. Después de 3 intentos fallidos, va a la Dead Letter Queue

### Simulación de fallos:

Para probar escenarios de fallo, use los endpoints de simulación:
- POST /notifications/simulate-failure - Deshabilita el servicio
- POST /notifications/simulate-recovery - Habilita el servicio
      `,
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Servidor de desarrollo',
      },
    ],
    tags: [
      {
        name: 'Payments',
        description: 'Operaciones de pagos',
      },
      {
        name: 'Notifications',
        description: 'Consulta de notificaciones',
      },
      {
        name: 'Notifications - Simulation',
        description: 'Simulación de fallos y recuperación',
      },
      {
        name: 'Notifications - DLQ',
        description: 'Gestión de la Dead Letter Queue',
      },
      {
        name: 'Health',
        description: 'Estado del servicio',
      },
    ],
  },
  apis: [
    './src/modules/payments/infrastructure/http/PaymentRoutes.js',
    './src/modules/notifications/infrastructure/http/NotificationRoutes.js',
    './src/shared/infrastructure/http/server.js',
  ],
};

const specs = swaggerJsdoc(options);

function setupSwagger(app) {
  // Servir documentación Swagger
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(specs, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Payment Service API Docs',
    })
  );

  // Endpoint para obtener el JSON de OpenAPI
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });
}

module.exports = {
  setupSwagger,
  specs,
};