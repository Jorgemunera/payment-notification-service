# Payment Notification Service

Servicio de pagos con notificaciones asíncronas usando RabbitMQ, diseñado con arquitectura hexagonal en un monolito modular.

## 📋 Tabla de Contenidos

- [Descripción](#descripción)
- [Arquitectura](#arquitectura)
- [Tecnologías](#tecnologías)
- [Requisitos Previos](#requisitos-previos)
- [Instalación y Ejecución](#instalación-y-ejecución)
- [Endpoints API](#endpoints-api)
- [Escenarios de Prueba](#escenarios-de-prueba)
- [Decisiones Técnicas](#decisiones-técnicas)
- [Estructura del Proyecto](#estructura-del-proyecto)

---

## Descripción

Este servicio implementa un sistema de pagos que:

1. **Procesa pagos exitosamente** con garantía de idempotencia
2. **Publica eventos de forma asíncrona** para notificaciones por email
3. **Garantiza entrega de notificaciones** incluso si el servicio falla temporalmente
4. **No revierte pagos** por fallos en notificaciones
5. **Reintenta automáticamente** con backoff exponencial (1s, 2s, 4s)
6. **Envía a Dead Letter Queue** después de 3 intentos fallidos
7. **Permite reprocesamiento manual** de mensajes fallidos

### Flujo Principal

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Cliente │────▶│   API    │────▶│ RabbitMQ │────▶│  Worker  │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                      │                                  │
                      ▼                                  ▼
                ┌──────────┐                      ┌──────────┐
                │ PostgreSQL│                      │  Email   │
                │  + Redis  │                      │ Service  │
                └──────────┘                      └──────────┘
```

---

## Arquitectura

### Monolito Modular con Arquitectura Hexagonal

```
┌─────────────────────────────────────────────────────────────────────┐
│                         MONOLITO MODULAR                             │
│                                                                      │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐   │
│  │      MÓDULO PAYMENTS        │  │    MÓDULO NOTIFICATIONS     │   │
│  │                             │  │                             │   │
│  │  ┌───────────────────────┐  │  │  ┌───────────────────────┐  │   │
│  │  │        Domain         │  │  │  │        Domain         │  │   │
│  │  │  - Payment Entity     │  │  │  │  - Notification Entity│  │   │
│  │  │  - Payment Errors     │  │  │  │  - Notification Errors│  │   │
│  │  │  - Repository (IF)    │  │  │  │  - Repository (IF)    │  │   │
│  │  └───────────────────────┘  │  │  └───────────────────────┘  │   │
│  │                             │  │                             │   │
│  │  ┌───────────────────────┐  │  │  ┌───────────────────────┐  │   │
│  │  │      Application      │  │  │  │      Application      │  │   │
│  │  │  - CreatePayment      │  │  │  │  - ProcessNotification│  │   │
│  │  │  - GetPayment         │  │  │  │  - GetNotifications   │  │   │
│  │  └───────────────────────┘  │  │  │  - DLQ Use Cases      │  │   │
│  │                             │  │  │  - EmailService       │  │   │
│  │  ┌───────────────────────┐  │  │  └───────────────────────┘  │   │
│  │  │    Infrastructure     │  │  │                             │   │
│  │  │  - PostgresRepo       │  │  │  ┌───────────────────────┐  │   │
│  │  │  - EventPublisher     │  │  │  │    Infrastructure     │  │   │
│  │  │  - HTTP Controller    │  │  │  │  - PostgresRepo       │  │   │
│  │  └───────────────────────┘  │  │  │  - Consumer           │  │   │
│  │                             │  │  │  - HTTP Controller    │  │   │
│  └─────────────────────────────┘  │  └───────────────────────┘  │   │
│                                   └─────────────────────────────┘   │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    SHARED INFRASTRUCTURE                       │  │
│  │  - PostgreSQL Connection    - Redis Client                    │  │
│  │  - RabbitMQ Connection      - HTTP Server                     │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Topología RabbitMQ

```
┌─────────────────────────────────────────────────────────────────────┐
│                           RABBITMQ                                   │
│                                                                      │
│  EXCHANGES                           QUEUES                          │
│  ┌─────────────────────┐            ┌─────────────────────────────┐ │
│  │  payments.events    │───────────▶│ notifications.payment-events│ │
│  │  (topic)            │            │ (durable, DLQ enabled)      │ │
│  └─────────────────────┘            └──────────────┬──────────────┘ │
│                                                    │                 │
│                                            (after 3 retries)        │
│                                                    │                 │
│  ┌─────────────────────┐            ┌──────────────▼──────────────┐ │
│  │  payments.dlx       │◀───────────│ notifications.dead-letter   │ │
│  │  (topic)            │            │ (durable)                   │ │
│  └─────────────────────┘            └─────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Tecnologías

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Node.js | 20 | Runtime JavaScript |
| Express | 4.21 | Framework HTTP |
| PostgreSQL | 15 | Base de datos principal |
| Redis | 7 | Idempotencia y locks distribuidos |
| RabbitMQ | 3.12 | Message broker para eventos |
| Docker | - | Containerización |
| Swagger | OpenAPI 3.0 | Documentación API |

---

## Requisitos Previos

- **Docker** y **Docker Compose** instalados
- **Git** para clonar el repositorio
- Puerto **3000** disponible (API)
- Puerto **5432** disponible (PostgreSQL)
- Puerto **6379** disponible (Redis)
- Puerto **5672** disponible (RabbitMQ)
- Puerto **15672** disponible (RabbitMQ Management UI)

---

## Instalación y Ejecución

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd payment-notification-service
```

### 2. Levantar todos los servicios

```bash
docker-compose up --build
```

Este comando levanta:
- PostgreSQL (base de datos)
- Redis (cache e idempotencia)
- RabbitMQ (message broker)
- API (servidor HTTP en puerto 3000)
- Worker (consumer de notificaciones)

### 3. Verificar que todo está corriendo

```bash
# Health check
curl http://localhost:3000/health

# Respuesta esperada:
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:00:00.000Z",
  "services": {
    "database": { "status": "healthy" },
    "redis": { "status": "healthy" },
    "rabbitmq": { "status": "healthy" }
  }
}
```

### 4. Acceder a las interfaces

| Servicio | URL |
|----------|-----|
| API Documentation (Swagger) | http://localhost:3000/api-docs |
| RabbitMQ Management | http://localhost:15672 (guest/guest) |

### Comandos útiles

```bash
# Ver logs de todos los servicios
docker-compose logs -f

# Ver logs solo de la API
docker-compose logs -f api

# Ver logs solo del Worker
docker-compose logs -f notification-worker

# Detener todos los servicios
docker-compose down

# Detener y eliminar volúmenes (reset completo)
docker-compose down -v

# Reiniciar solo el worker
docker-compose restart notification-worker
```

---

## Endpoints API

### Payments

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | /payments | Crear un nuevo pago |
| GET | /payments/:id | Obtener pago con su notificación |

### Notifications

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | /notifications | Listar notificaciones (con filtros) |
| GET | /notifications/status | Estado del servicio |
| POST | /notifications/simulate-failure | Simular fallo del servicio |
| POST | /notifications/simulate-recovery | Simular recuperación |
| GET | /notifications/dead-letter-queue | Ver mensajes en DLQ |
| POST | /notifications/dead-letter-queue/retry-all | Reprocesar todos |
| POST | /notifications/dead-letter-queue/:messageId/retry | Reprocesar uno |

### Health

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | /health | Estado de todas las conexiones |

---

## Escenarios de Prueba

### Escenario 1: Flujo exitoso completo

**Objetivo:** Verificar que un pago se crea y la notificación se envía correctamente.

```bash
# 1. Crear un pago
curl -X POST http://localhost:3000/payments \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-001" \
  -d '{
    "amount": 50000,
    "currency": "COP",
    "accountId": "acc_123",
    "email": "cliente@example.com",
    "description": "Pago de prueba"
  }'

# Respuesta esperada (201 Created):
{
  "id": "pay_xxxxxxxxxxxx",
  "amount": 50000,
  "currency": "COP",
  "accountId": "acc_123",
  "email": "cliente@example.com",
  "description": "Pago de prueba",
  "status": "SUCCESS",
  "createdAt": "...",
  "updatedAt": "..."
}

# 2. Esperar 2-3 segundos y consultar el pago
curl http://localhost:3000/payments/pay_xxxxxxxxxxxx

# Respuesta esperada - notificación SENT:
{
  "id": "pay_xxxxxxxxxxxx",
  "amount": 50000,
  ...
  "notification": {
    "id": "ntf_xxxxxxxxxxxx",
    "status": "SENT",
    "attempts": 1,
    "sentAt": "..."
  }
}
```

**Verificar en logs del worker:**
```
[INFO] [CONSUMER:NOTIFICATION] 📨 MENSAJE RECIBIDO
[INFO] [SERVICE:EMAIL] 📧 EMAIL ENVIADO EXITOSAMENTE
[INFO] [CONSUMER:NOTIFICATION] ✅ Mensaje procesado exitosamente
```

---

### Escenario 2: Idempotencia - evitar pagos duplicados

**Objetivo:** Verificar que el mismo Idempotency-Key no crea pagos duplicados.

```bash
# 1. Crear pago con key específica
curl -X POST http://localhost:3000/payments \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: unique-key-123" \
  -d '{
    "amount": 75000,
    "currency": "COP",
    "accountId": "acc_456",
    "email": "otro@example.com"
  }'

# Guardar el ID retornado: pay_aaaaaaaaaaaa

# 2. Intentar crear otro pago con LA MISMA key
curl -X POST http://localhost:3000/payments \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: unique-key-123" \
  -d '{
    "amount": 99999,
    "currency": "USD",
    "accountId": "acc_999",
    "email": "diferente@example.com"
  }'

# Respuesta: Retorna el MISMO pago original (pay_aaaaaaaaaaaa)
# NO crea un nuevo pago aunque los datos sean diferentes
```

---

### Escenario 3: Fallo del servicio y recuperación automática

**Objetivo:** Verificar que si el servicio falla, los mensajes se reintentan.

```bash
# 1. Deshabilitar el servicio de notificaciones
curl -X POST http://localhost:3000/notifications/simulate-failure

# Respuesta:
{
  "success": true,
  "message": "Servicio de notificaciones deshabilitado",
  "status": { "enabled": false }
}

# 2. Crear un pago (el pago se crea exitosamente)
curl -X POST http://localhost:3000/payments \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-failure-001" \
  -d '{
    "amount": 30000,
    "currency": "COP",
    "accountId": "acc_789",
    "email": "test@example.com"
  }'

# 3. Observar en logs los reintentos (1s, 2s, 4s)
# [WARN] 🔄 Reintentando en 1000ms
# [WARN] 🔄 Reintentando en 2000ms
# [WARN] 🔄 Reintentando en 4000ms
# [ERROR] 💀 Máximo de reintentos alcanzado, enviando a DLQ

# 4. Verificar que el pago está SUCCESS pero notificación FAILED
curl http://localhost:3000/payments/pay_xxxxxxxxxxxx

# 5. Ver el mensaje en la Dead Letter Queue
curl http://localhost:3000/notifications/dead-letter-queue

# 6. Habilitar el servicio nuevamente
curl -X POST http://localhost:3000/notifications/simulate-recovery

# 7. Reprocesar los mensajes fallidos
curl -X POST http://localhost:3000/notifications/dead-letter-queue/retry-all

# 8. Verificar que la notificación ahora está SENT
curl http://localhost:3000/payments/pay_xxxxxxxxxxxx
```

---

### Escenario 4: Dead Letter Queue - reprocesar mensaje específico

**Objetivo:** Reprocesar un mensaje específico de la DLQ.

```bash
# 1. Deshabilitar servicio y crear varios pagos
curl -X POST http://localhost:3000/notifications/simulate-failure

curl -X POST http://localhost:3000/payments \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: dlq-test-001" \
  -d '{"amount": 10000, "accountId": "acc_1", "email": "a@test.com"}'

curl -X POST http://localhost:3000/payments \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: dlq-test-002" \
  -d '{"amount": 20000, "accountId": "acc_2", "email": "b@test.com"}'

# 2. Esperar a que lleguen a la DLQ (~10 segundos)

# 3. Listar mensajes en DLQ
curl http://localhost:3000/notifications/dead-letter-queue

# Respuesta:
{
  "count": 2,
  "messages": [
    { "messageId": "evt_123...", "paymentId": "pay_aaa...", ... },
    { "messageId": "evt_456...", "paymentId": "pay_bbb...", ... }
  ]
}

# 4. Habilitar servicio
curl -X POST http://localhost:3000/notifications/simulate-recovery

# 5. Reprocesar solo UN mensaje específico
curl -X POST http://localhost:3000/notifications/dead-letter-queue/evt_123.../retry

# 6. Verificar que solo ese pago tiene notificación SENT
```

---

### Escenario 5: Ver acumulación de mensajes en RabbitMQ

**Objetivo:** Ver visualmente los mensajes en cola.

```bash
# 1. Detener el worker
docker-compose stop notification-worker

# 2. Crear varios pagos
for i in {1..5}; do
  curl -X POST http://localhost:3000/payments \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: queue-test-$i" \
    -d "{\"amount\": ${i}0000, \"accountId\": \"acc_$i\", \"email\": \"test$i@example.com\"}"
done

# 3. Abrir RabbitMQ Management UI
# http://localhost:15672 (guest/guest)
# Ir a Queues -> notifications.payment-events
# Ver 5 mensajes Ready

# 4. Reiniciar el worker
docker-compose start notification-worker

# 5. Ver en la UI cómo los mensajes se procesan
```

---

### Escenario 6: Validación de errores

**Objetivo:** Verificar validaciones del API.

```bash
# Sin Idempotency-Key
curl -X POST http://localhost:3000/payments \
  -H "Content-Type: application/json" \
  -d '{"amount": 50000, "accountId": "acc_1", "email": "test@test.com"}'

# Respuesta (400):
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "El header Idempotency-Key es requerido"
  }
}

# Monto inválido
curl -X POST http://localhost:3000/payments \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-validation" \
  -d '{"amount": -100, "accountId": "acc_1", "email": "test@test.com"}'

# Email inválido
curl -X POST http://localhost:3000/payments \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-validation-2" \
  -d '{"amount": 50000, "accountId": "acc_1", "email": "invalid-email"}'
```

---

## Decisiones Técnicas

### ¿Por qué Arquitectura Hexagonal?

- **Desacoplamiento:** El dominio no conoce detalles de infraestructura
- **Testabilidad:** Los use cases se pueden probar sin BD real
- **Flexibilidad:** Cambiar PostgreSQL por otro motor es trivial
- **Claridad:** Cada capa tiene responsabilidades claras

### ¿Por qué Monolito Modular?

- **Simplicidad:** Un solo despliegue, fácil de mantener
- **Contexto del reto:** Sistema financiero inicial
- **Escalabilidad futura:** Fácil de separar en microservicios si es necesario
- **Comunicación entre módulos:** Eficiente al estar en el mismo proceso

### ¿Por qué Redis para Idempotencia?

- **Velocidad:** Verificación O(1) antes de tocar la BD
- **TTL automático:** Las claves expiran sin lógica adicional
- **Locks distribuidos:** Previene race conditions entre requests concurrentes
- **Atomicidad:** SETNX garantiza operaciones atómicas

### ¿Por qué RabbitMQ?

- **Durabilidad:** Mensajes persisten en disco
- **Acknowledgments:** Garantía de entrega
- **Dead Letter Exchange:** Manejo elegante de fallos
- **Routing flexible:** Exchanges tipo topic para múltiples consumers

### ¿Por qué Backoff Exponencial?

- **Evita sobrecarga:** No bombardea un servicio caído
- **Da tiempo de recuperación:** 1s → 2s → 4s
- **Estándar de la industria:** Patrón probado en sistemas distribuidos

### ¿Por qué Worker Separado?

- **Aislamiento:** Fallos del worker no afectan la API
- **Escalabilidad:** Se pueden agregar más workers
- **Demostración:** Permite simular escenarios de caída

---

## Estructura del Proyecto

```
payment-notification-service/
├── docker-compose.yml              # Orquestación de servicios
├── Dockerfile                      # Imagen de la aplicación
├── package.json                    # Dependencias
├── .env.example                    # Variables de entorno
├── README.md                       # Esta documentación
│
├── scripts/
│   └── init-db.sql                 # Inicialización de BD
│
└── src/
    ├── index.js                    # Entry point API
    ├── worker.js                   # Entry point Worker
    ├── container.js                # Inyección de dependencias
    │
    ├── config/
    │   └── index.js                # Configuración centralizada
    │
    ├── shared/
    │   ├── infrastructure/
    │   │   ├── database/           # PostgreSQL
    │   │   ├── cache/              # Redis
    │   │   ├── messaging/          # RabbitMQ
    │   │   └── http/               # Express + Swagger
    │   └── utils/
    │       ├── logger.js           # Logging
    │       └── id-generator.js     # Generación de IDs
    │
    └── modules/
        ├── payments/
        │   ├── domain/             # Entidades, errores, interfaces
        │   ├── application/        # Use cases
        │   └── infrastructure/     # Repos, controllers, routes
        │
        └── notifications/
            ├── domain/             # Entidades, errores, interfaces
            ├── application/        # Use cases, EmailService
            └── infrastructure/     # Repos, consumer, controllers
```

---

## Autor

Desarrollado como prueba técnica para demostrar conocimientos en:
- Node.js y Express
- PostgreSQL y Redis
- RabbitMQ y mensajería asíncrona
- Arquitectura hexagonal
- Patrones de resiliencia (idempotencia, reintentos, DLQ)
- Docker y containerización