const express = require('express');
const {
  validateGetNotifications,
  validateRetryMessage,
  validateMaxMessages,
} = require('./NotificationValidator');

function createNotificationRoutes(notificationController) {
  const router = express.Router();

  /**
   * @swagger
   * /notifications:
   *   get:
   *     summary: Listar notificaciones
   *     description: Obtiene una lista de notificaciones con filtros opcionales y paginación.
   *     tags: [Notifications]
   *     parameters:
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [PENDING, PROCESSING, SENT, FAILED, RETRIED]
   *         description: Filtrar por estado
   *       - in: query
   *         name: paymentId
   *         schema:
   *           type: string
   *         description: Filtrar por ID de pago
   *         example: pay_a1b2c3d4e5f6
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 50
   *         description: Límite de resultados
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *           minimum: 0
   *           default: 0
   *         description: Offset para paginación
   *     responses:
   *       200:
   *         description: Lista de notificaciones
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 notifications:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Notification'
   *                 pagination:
   *                   type: object
   *                   properties:
   *                     total:
   *                       type: integer
   *                     limit:
   *                       type: integer
   *                     offset:
   *                       type: integer
   *                     hasMore:
   *                       type: boolean
   */
  router.get(
    '/',
    validateGetNotifications,
    (req, res, next) => notificationController.getAll(req, res, next)
  );

  /**
   * @swagger
   * /notifications/status:
   *   get:
   *     summary: Estado del servicio de notificaciones
   *     description: Retorna el estado actual del servicio de notificaciones y conteo por estado.
   *     tags: [Notifications]
   *     responses:
   *       200:
   *         description: Estado del servicio
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 service:
   *                   type: object
   *                   properties:
   *                     service:
   *                       type: string
   *                       example: email
   *                     enabled:
   *                       type: boolean
   *                     status:
   *                       type: string
   *                       enum: [operational, unavailable]
   *                 notifications:
   *                   type: object
   *                   properties:
   *                     PENDING:
   *                       type: integer
   *                     PROCESSING:
   *                       type: integer
   *                     SENT:
   *                       type: integer
   *                     FAILED:
   *                       type: integer
   *                     RETRIED:
   *                       type: integer
   */
  router.get(
    '/status',
    (req, res, next) => notificationController.getStatus(req, res, next)
  );

  /**
   * @swagger
   * /notifications/simulate-failure:
   *   post:
   *     summary: Simular fallo del servicio
   *     description: Deshabilita el servicio de notificaciones para simular un fallo.
   *     tags: [Notifications - Simulation]
   *     responses:
   *       200:
   *         description: Servicio deshabilitado
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *                 status:
   *                   type: object
   */
  router.post(
    '/simulate-failure',
    (req, res, next) => notificationController.simulateFailure(req, res, next)
  );

  /**
   * @swagger
   * /notifications/simulate-recovery:
   *   post:
   *     summary: Simular recuperación del servicio
   *     description: Habilita el servicio de notificaciones para simular una recuperación.
   *     tags: [Notifications - Simulation]
   *     responses:
   *       200:
   *         description: Servicio habilitado
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *                 status:
   *                   type: object
   */
  router.post(
    '/simulate-recovery',
    (req, res, next) => notificationController.simulateRecovery(req, res, next)
  );

  /**
   * @swagger
   * /notifications/dead-letter-queue:
   *   get:
   *     summary: Obtener mensajes de la Dead Letter Queue
   *     description: Lista los mensajes que fallaron y están en la DLQ esperando revisión.
   *     tags: [Notifications - DLQ]
   *     parameters:
   *       - in: query
   *         name: maxMessages
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 1000
   *           default: 100
   *         description: Máximo número de mensajes a obtener
   *     responses:
   *       200:
   *         description: Mensajes de la DLQ
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 count:
   *                   type: integer
   *                 messages:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       messageId:
   *                         type: string
   *                       paymentId:
   *                         type: string
   *                       notificationId:
   *                         type: string
   *                       originalQueue:
   *                         type: string
   *                       reason:
   *                         type: string
   *                       failedAt:
   *                         type: string
   *                         format: date-time
   *                       eventType:
   *                         type: string
   *                       timestamp:
   *                         type: string
   *                         format: date-time
   */
  router.get(
    '/dead-letter-queue',
    validateMaxMessages,
    (req, res, next) => notificationController.getDeadLetterQueue(req, res, next)
  );

  /**
   * @swagger
   * /notifications/dead-letter-queue/retry-all:
   *   post:
   *     summary: Reprocesar todos los mensajes de la DLQ
   *     description: Reencola todos los mensajes de la DLQ para ser procesados nuevamente.
   *     tags: [Notifications - DLQ]
   *     responses:
   *       200:
   *         description: Mensajes reencolados
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 retriedCount:
   *                   type: integer
   *                 message:
   *                   type: string
   */
  router.post(
    '/dead-letter-queue/retry-all',
    (req, res, next) => notificationController.retryAllMessages(req, res, next)
  );

  /**
   * @swagger
   * /notifications/dead-letter-queue/{messageId}/retry:
   *   post:
   *     summary: Reprocesar un mensaje específico de la DLQ
   *     description: Reencola un mensaje específico de la DLQ para ser procesado nuevamente.
   *     tags: [Notifications - DLQ]
   *     parameters:
   *       - in: path
   *         name: messageId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID del mensaje a reprocesar
   *     responses:
   *       200:
   *         description: Mensaje reencolado
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 messageId:
   *                   type: string
   *                 message:
   *                   type: string
   *       404:
   *         description: Mensaje no encontrado en DLQ
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.post(
    '/dead-letter-queue/:messageId/retry',
    validateRetryMessage,
    (req, res, next) => notificationController.retryMessage(req, res, next)
  );

  return router;
}

module.exports = createNotificationRoutes;