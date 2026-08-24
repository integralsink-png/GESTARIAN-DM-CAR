-- =============================================================================
-- MIGRACIÓN: Datos de prueba para roles, licencias y portal de cliente
-- =============================================================================

-- 1. Insertar o actualizar roles si no existen
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'roles') THEN
    CREATE TABLE roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nombre VARCHAR(50) UNIQUE NOT NULL,
      descripcion TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    INSERT INTO roles (nombre, descripcion) VALUES
      ('WORKSHOP_FREE', 'Taller Plan Free'),
      ('WORKSHOP_PRO', 'Taller Plan Pro'),
      ('CUSTOMER', 'Cliente Final'),
      ('DEVELOPER', 'Desarrollador'),
      ('ADMIN', 'Administrador')
    ON CONFLICT (nombre) DO NOTHING;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'planes') THEN
    CREATE TABLE planes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nombre VARCHAR(50) UNIQUE NOT NULL,
      precio NUMERIC(10,2) DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    INSERT INTO planes (nombre, precio) VALUES
      ('FREE', 0),
      ('PRO', 49.99),
      ('ENTERPRISE', 199.99),
      ('DEVELOPER_PLAN', 0)
    ON CONFLICT (nombre) DO NOTHING;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'licencias') THEN
    CREATE TABLE licencias (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
      plan_id UUID REFERENCES planes(id),
      estado VARCHAR(20) DEFAULT 'activo' CHECK (estado IN ('activo', 'prueba', 'bloqueado', 'inactivo')),
      fecha_inicio TIMESTAMPTZ DEFAULT NOW(),
      fecha_fin TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
END $$;

-- 2. Asegurar columnas en usuarios
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS rol_id UUID REFERENCES roles(id);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES planes(id);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS licencia_id UUID REFERENCES licencias(id);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS es_developer BOOLEAN DEFAULT false;

-- 3. Insertar o actualizar usuarios de prueba
INSERT INTO usuarios (email, nombre, rol, activo, rol_id, plan_id, es_developer)
VALUES
  ('free@test.com', 'Taller Free', 'operario', true, 
   (SELECT id FROM roles WHERE nombre = 'WORKSHOP_FREE'), 
   (SELECT id FROM planes WHERE nombre = 'FREE'), false),

  ('pro@test.com', 'Taller Pro', 'jefe', true,
   (SELECT id FROM roles WHERE nombre = 'WORKSHOP_PRO'),
   (SELECT id FROM planes WHERE nombre = 'PRO'), false),

  ('cliente@test.com', 'Cliente Prueba', 'operario', true,
   (SELECT id FROM roles WHERE nombre = 'CUSTOMER'), 
   NULL, false)
ON CONFLICT (email) DO UPDATE 
SET rol_id = EXCLUDED.rol_id, plan_id = EXCLUDED.plan_id, es_developer = EXCLUDED.es_developer;

-- 4. Crear licencias para los talleres
INSERT INTO licencias (usuario_id, plan_id, estado, fecha_inicio, fecha_fin)
SELECT id, (SELECT id FROM planes WHERE nombre = 'FREE'), 'activo', NOW(), NOW() + INTERVAL '1 year'
FROM usuarios WHERE email = 'free@test.com'
AND NOT EXISTS (SELECT 1 FROM licencias WHERE usuario_id = usuarios.id);

INSERT INTO licencias (usuario_id, plan_id, estado, fecha_inicio, fecha_fin)
SELECT id, (SELECT id FROM planes WHERE nombre = 'PRO'), 'activo', NOW(), NOW() + INTERVAL '1 year'
FROM usuarios WHERE email = 'pro@test.com'
AND NOT EXISTS (SELECT 1 FROM licencias WHERE usuario_id = usuarios.id);

-- 5. Asignar licencia_id a los usuarios
UPDATE usuarios u
SET licencia_id = l.id
FROM licencias l
WHERE u.email IN ('free@test.com', 'pro@test.com') AND l.usuario_id = u.id;

-- 6. Crear cliente, vehículo y expediente para el portal de cliente
INSERT INTO clientes (id, nombre, email, telefono)
VALUES ('c1111111-1111-1111-1111-111111111111', 'Cliente Demo', 'cliente@demo.com', '600000000')
ON CONFLICT (id) DO NOTHING;

INSERT INTO vehiculos (id, matricula, marca, modelo, cliente_id)
VALUES ('v1111111-1111-1111-1111-111111111111', '1234ABC', 'Seat', 'Leon', 'c1111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

INSERT INTO reparaciones (id, cliente_id, vehiculo_id, estado, descripcion)
VALUES ('r1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'v1111111-1111-1111-1111-111111111111', 'en_proceso', 'Revisión general y cambio de aceite')
ON CONFLICT (id) DO NOTHING;

-- 7. Crear tabla e invitación para el cliente
CREATE TABLE IF NOT EXISTS cliente_invitaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  vehiculo_id UUID REFERENCES vehiculos(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL DEFAULT md5(random()::text),
  enviado BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO cliente_invitaciones (cliente_id, vehiculo_id, email, token, enviado)
VALUES (
  'c1111111-1111-1111-1111-111111111111',
  'v1111111-1111-1111-1111-111111111111',
  'cliente@demo.com',
  'demo-token-1234',
  true
)
ON CONFLICT (token) DO NOTHING;
