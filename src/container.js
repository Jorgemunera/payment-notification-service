const { Logger } = require('./shared/utils/logger');

// Infrastructure - Database
const postgres = require('./shared/infrastructure/database/postgres');

// Infrastructure - Cache
const redisClient = require('./shared/infrastructure/cache/redis');

// Infrastructure - Messaging
const rabbitmq = require('./shared/infrastructure/messaging/rabbitmq');
const { setupTopology } = require('./shared/infrastructure/messaging/setup');

// Payments - Domain & Infrastructure
const PostgresPaymentRepository = require('./modules/payments/infrastructure/persistence/PostgresPaymentRepository');
const PaymentEventPublisher = require('./modules/payments/infrastructure/messaging/PaymentEventPublisher');

// Payments - Application
const CreatePayment = require('./modules/payments/application/use-cases/CreatePayment');
const GetPayment = require('./modules/payments/application/use-cases/GetPayment');

// Payments - HTTP
const PaymentController = require('./modules/payments/infrastructure/http/PaymentController');
const createPaymentRoutes = require('./modules/payments/infrastructure/http/PaymentRoutes');

// Notifications - Domain & Infrastructure
const PostgresNotificationRepository = require('./modules/notifications/infrastructure/persistence/PostgresNotificationRepository');
const NotificationConsumer = require('./modules/notifications/infrastructure/messaging/NotificationConsumer');

// Notifications - Application
const EmailService = require('./modules/notifications/application/services/EmailService');
const CreateNotification = require('./modules/notifications/application/use-cases/CreateNotification');
const ProcessNotification = require('./modules/notifications/application/use-cases/ProcessNotification');
const GetNotifications = require('./modules/notifications/application/use-cases/GetNotifications');
const GetDeadLetterMessages = require('./modules/notifications/application/use-cases/GetDeadLetterMessages');
const RetryDeadLetterMessage = require('./modules/notifications/application/use-cases/RetryDeadLetterMessage');
const RetryAllDeadLetterMessages = require('./modules/notifications/application/use-cases/RetryAllDeadLetterMessages');

// Notifications - HTTP
const NotificationController = require('./modules/notifications/infrastructure/http/NotificationController');
const createNotificationRoutes = require('./modules/notifications/infrastructure/http/NotificationRoutes');

const logger = new Logger('CONTAINER');

class Container {
  constructor() {
    this._instances = {};
    this._initialized = false;
  }

  async initialize() {
    if (this._initialized) {
      logger.warn('Container ya inicializado');
      return;
    }

    logger.info('Inicializando container de dependencias...');

    // ============================================
    // REPOSITORIES
    // ============================================
    this._instances.paymentRepository = new PostgresPaymentRepository();
    this._instances.notificationRepository = new PostgresNotificationRepository();

    // ============================================
    // SERVICES
    // ============================================
    this._instances.emailService = new EmailService();
    this._instances.paymentEventPublisher = new PaymentEventPublisher();

    // ============================================
    // PAYMENTS - USE CASES
    // ============================================
    this._instances.createPaymentUseCase = new CreatePayment({
      paymentRepository: this._instances.paymentRepository,
      notificationRepository: this._instances.notificationRepository,
      redisClient: redisClient,
      eventPublisher: this._instances.paymentEventPublisher,
    });

    this._instances.getPaymentUseCase = new GetPayment({
      paymentRepository: this._instances.paymentRepository,
      notificationRepository: this._instances.notificationRepository,
    });

    // ============================================
    // NOTIFICATIONS - USE CASES
    // ============================================
    this._instances.createNotificationUseCase = new CreateNotification({
      notificationRepository: this._instances.notificationRepository,
    });

    this._instances.processNotificationUseCase = new ProcessNotification({
      notificationRepository: this._instances.notificationRepository,
      emailService: this._instances.emailService,
    });

    this._instances.getNotificationsUseCase = new GetNotifications({
      notificationRepository: this._instances.notificationRepository,
    });

    this._instances.getDeadLetterMessagesUseCase = new GetDeadLetterMessages();

    this._instances.retryDeadLetterMessageUseCase = new RetryDeadLetterMessage({
      notificationRepository: this._instances.notificationRepository,
    });

    this._instances.retryAllDeadLetterMessagesUseCase = new RetryAllDeadLetterMessages();

    // ============================================
    // CONTROLLERS
    // ============================================
    this._instances.paymentController = new PaymentController({
      createPaymentUseCase: this._instances.createPaymentUseCase,
      getPaymentUseCase: this._instances.getPaymentUseCase,
    });

    this._instances.notificationController = new NotificationController({
      getNotificationsUseCase: this._instances.getNotificationsUseCase,
      getDeadLetterMessagesUseCase: this._instances.getDeadLetterMessagesUseCase,
      retryDeadLetterMessageUseCase: this._instances.retryDeadLetterMessageUseCase,
      retryAllDeadLetterMessagesUseCase: this._instances.retryAllDeadLetterMessagesUseCase,
      emailService: this._instances.emailService,
      notificationRepository: this._instances.notificationRepository,
    });

    // ============================================
    // ROUTES
    // ============================================
    this._instances.paymentRoutes = createPaymentRoutes(this._instances.paymentController);
    this._instances.notificationRoutes = createNotificationRoutes(this._instances.notificationController);

    // ============================================
    // CONSUMER
    // ============================================
    this._instances.notificationConsumer = new NotificationConsumer({
      processNotificationUseCase: this._instances.processNotificationUseCase,
      notificationRepository: this._instances.notificationRepository,
    });

    this._initialized = true;
    logger.info('Container inicializado correctamente');
  }

  get(name) {
    if (!this._initialized) {
      throw new Error('Container no inicializado. Llama a initialize() primero.');
    }

    const instance = this._instances[name];
    if (!instance) {
      throw new Error(`Dependencia no encontrada: ${name}`);
    }

    return instance;
  }

  // Getters para acceso directo
  get paymentRepository() { return this.get('paymentRepository'); }
  get notificationRepository() { return this.get('notificationRepository'); }
  get emailService() { return this.get('emailService'); }
  get paymentEventPublisher() { return this.get('paymentEventPublisher'); }
  get createPaymentUseCase() { return this.get('createPaymentUseCase'); }
  get getPaymentUseCase() { return this.get('getPaymentUseCase'); }
  get createNotificationUseCase() { return this.get('createNotificationUseCase'); }
  get processNotificationUseCase() { return this.get('processNotificationUseCase'); }
  get getNotificationsUseCase() { return this.get('getNotificationsUseCase'); }
  get getDeadLetterMessagesUseCase() { return this.get('getDeadLetterMessagesUseCase'); }
  get retryDeadLetterMessageUseCase() { return this.get('retryDeadLetterMessageUseCase'); }
  get retryAllDeadLetterMessagesUseCase() { return this.get('retryAllDeadLetterMessagesUseCase'); }
  get paymentController() { return this.get('paymentController'); }
  get notificationController() { return this.get('notificationController'); }
  get paymentRoutes() { return this.get('paymentRoutes'); }
  get notificationRoutes() { return this.get('notificationRoutes'); }
  get notificationConsumer() { return this.get('notificationConsumer'); }
}

// Singleton
const container = new Container();

module.exports = container;