-- ============================================
-- TABLA: payments
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(20) PRIMARY KEY,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'COP',
    account_id VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    description VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para payments
CREATE INDEX IF NOT EXISTS idx_payments_account_id ON payments(account_id);
CREATE INDEX IF NOT EXISTS idx_payments_idempotency_key ON payments(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- ============================================
-- TABLA: notifications
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(20) PRIMARY KEY,
    payment_id VARCHAR(20) NOT NULL REFERENCES payments(id),
    type VARCHAR(20) NOT NULL DEFAULT 'EMAIL',
    recipient VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    attempts INTEGER NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para notifications
CREATE INDEX IF NOT EXISTS idx_notifications_payment_id ON notifications(payment_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================
-- Comentarios de documentación
-- ============================================
COMMENT ON TABLE payments IS 'Registro de todos los pagos procesados';
COMMENT ON COLUMN payments.id IS 'ID único con formato pay_xxxxx';
COMMENT ON COLUMN payments.idempotency_key IS 'Clave de idempotencia proporcionada por el cliente';
COMMENT ON COLUMN payments.status IS 'Estado del pago: SUCCESS';

COMMENT ON TABLE notifications IS 'Registro de notificaciones asociadas a pagos';
COMMENT ON COLUMN notifications.id IS 'ID único con formato ntf_xxxxx';
COMMENT ON COLUMN notifications.status IS 'Estado: PENDING, PROCESSING, SENT, FAILED, RETRIED';
COMMENT ON COLUMN notifications.attempts IS 'Número de intentos de envío';