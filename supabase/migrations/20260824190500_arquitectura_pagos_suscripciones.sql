-- Migración: Preparación de arquitectura para pagos y suscripciones (Stripe/Bizum)
-- Tablas de suscripciones, pagos de suscripción, cupones y cupones de usuario

-- 1. Tabla de suscripciones
CREATE TABLE IF NOT EXISTS suscripciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    taller_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    plan TEXT CHECK (plan IN ('mensual', 'anual')),
    estado TEXT CHECK (estado IN ('activo', 'cancelado', 'vencido', 'pendiente')),
    fecha_inicio TIMESTAMPTZ,
    fecha_fin TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de pagos de suscripciones
CREATE TABLE IF NOT EXISTS pagos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suscripcion_id UUID REFERENCES suscripciones(id) ON DELETE CASCADE,
    stripe_payment_intent_id TEXT,
    importe DECIMAL(10,2) NOT NULL,
    moneda TEXT NOT NULL DEFAULT 'EUR',
    estado TEXT CHECK (estado IN ('exitoso', 'fallido', 'pendiente')),
    fecha TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de cupones de descuento
CREATE TABLE IF NOT EXISTS cupones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT UNIQUE NOT NULL,
    descuento_porcentaje INTEGER CHECK (descuento_porcentaje >= 0 AND descuento_porcentaje <= 100),
    valido_hasta TIMESTAMPTZ,
    usos_maximos INTEGER,
    usos_actuales INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla de cupones asignados a usuarios
CREATE TABLE IF NOT EXISTS cupones_usuario (
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    cupon_id UUID REFERENCES cupones(id) ON DELETE CASCADE,
    fecha_asignacion TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (usuario_id, cupon_id)
);

-- 5. Añadir columnas a usuarios
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS es_pro BOOLEAN DEFAULT false;

-- 6. Añadir campos de configuración si no existen
ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS limite_usuarios_free INTEGER DEFAULT 3;
ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS precio_pro_mensual DECIMAL(10,2) DEFAULT 0;
ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS precio_pro_anual DECIMAL(10,2) DEFAULT 0;
ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS dias_prueba_pro INTEGER DEFAULT 0;
ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS pro_activo BOOLEAN DEFAULT false;
