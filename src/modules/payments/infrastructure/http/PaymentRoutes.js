const express = require('express');
const { validateCreatePayment, validateGetPayment } = require('./PaymentValidator');

function createPaymentRoutes(paymentController) {
  const router = express.Router();

  /**
   * @swagger
   * components:
   *   schemas:
   *     Payment:
   *       type: object
   *       properties:
   *         id:
   *           type: string
   *           example: pay_a1b2c3d4e5f6
   *         amount:
   *           type: number
   *           example: 50000.00
   *         currency:
   *           type: string
   *           enum: [COP, USD]
   *           example: COP
   *         accountId:
   *           type: string
   *           example: acc_123456
   *         email:
   *           type: string
   *           example: cliente@example.com
   *         description:
   *           type: string
   *           example: Pago de servicio
   *         status:
   *           type: string
   *           enum: [SUCCESS]
   *           example: SUCCESS
   *         createdAt:
   *           type: string
   *           format: date-time
   *         updatedAt:
   *           type: string
   *           format: date-time
   *     
   *     PaymentWithNotification:
   *       allOf:
   *         - $ref: '#/components/schemas/Payment'
   *         - type: object
   *           properties:
   *             notification:
   *               $ref: '#/components/schemas/Notification'
   *     
   *     Notification:
   *       type: object
   *       properties:
   *         id:
   *           type: string
   *           example: ntf_x1y2z3w4v5u6
   *         paymentId:
   *           type: string
   *           example: pay_a1b2c3d4e5f6
   *         type:
   *           type: string
   *           enum: [EMAIL]
   *           example: EMAIL
   *         recipient:
   *           type: string
   *           example: cliente@example.com
   *         status:
   *           type: string
   *           enum: [PENDING, PROCESSING, SENT, FAILED, RETRIED]
   *           example: PENDING
   *         attempts:
   *           type: integer
   *           example: 0
   *         lastAttemptAt:
   *           type: string
   *           format: date-time
   *           nullable: true
   *         sentAt:
   *           type: string
   *           format: date-time
   *           nullable: true
   *         errorMessage:
   *           type: string
   *           nullable: true
   *         createdAt:
   *           type: string
   *           format: date-time
   *         updatedAt:
   *           type: string
   *           format: date-time
   *     
   *     CreatePaymentRequest:
   *       type: object
   *       required:
   *         - amount
   *         - accountId
   *         - email
   *       properties:
   *         amount:
   *           type: number
   *           minimum: 0.01
   *           example: 50000.00
   *         currency:
   *           type: string
   *           enum: [COP, USD]
   *           default: COP
   *         accountId:
   *           type: string
   *           example: acc_123456
   *         email:
   *           type: string
   *           format: email
   *           example: cliente@example.com
   *         description:
   *           type: string
   *           maxLength: 255
   *           example: Pago de servicio
   *     
   *     Error:
   *       type: object
   *       properties:
   *         success:
   *           type: boolean
   *           example: false
   *         error:
   *           type: object
   *           properties:
   *             code:
   *               type: string
   *               example: VALIDATION_ERROR
   *             message:
   *               type: string
   *               example: El monto es requerido
   *   
   *   parameters:
   *     IdempotencyKey:
   *       in: header
   *       name: Idempotency-Key
   *       required: true
   *       schema:
   *         type: string
   *       description: Clave única para garantizar idempotencia
   *       example: unique-key-12345
   */

  /**
   * @swagger
   * /payments:
   *   post:
   *     summary: Crear un nuevo pago
   *     description: |
   *       Crea un nuevo pago y encola una notificación por email.
   *       Requiere el header Idempotency-Key para garantizar que el pago no se procese más de una vez.
   *     tags: [Payments]
   *     parameters:
   *       - $ref: '#/components/parameters/IdempotencyKey'
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreatePaymentRequest'
   *     responses:
   *       201:
   *         description: Pago creado exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Payment'
   *       400:
   *         description: Error de validación
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       500:
   *         description: Error interno del servidor
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.post(
    '/',
    validateCreatePayment,
    (req, res, next) => paymentController.create(req, res, next)
  );

  /**
   * @swagger
   * /payments/{id}:
   *   get:
   *     summary: Obtener un pago por ID
   *     description: Retorna los detalles de un pago incluyendo el estado de su notificación asociada.
   *     tags: [Payments]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: ID del pago
   *         example: pay_a1b2c3d4e5f6
   *     responses:
   *       200:
   *         description: Pago encontrado
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/PaymentWithNotification'
   *       404:
   *         description: Pago no encontrado
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.get(
    '/:id',
    validateGetPayment,
    (req, res, next) => paymentController.getById(req, res, next)
  );

  return router;
}

module.exports = createPaymentRoutes;