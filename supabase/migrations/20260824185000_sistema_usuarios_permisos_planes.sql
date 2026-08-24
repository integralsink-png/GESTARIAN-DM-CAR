-- Migración: Sistema completo de gestión de usuarios, roles, jerarquías, especialidades, epígrafes IAE y configuración de planes

-- 1. Tabla de especialidades
CREATE TABLE IF NOT EXISTS especialidades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabla de epígrafes IAE
CREATE TABLE IF NOT EXISTS epigrafes_iae (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT NOT NULL UNIQUE,
    descripcion TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabla de permisos y permisos específicos por usuario
CREATE TABLE IF NOT EXISTS permisos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clave TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usuario_permisos (
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    permiso_id UUID REFERENCES permisos(id) ON DELETE CASCADE,
    PRIMARY KEY (usuario_id, permiso_id)
);

-- 4. Modificar roles para jerarquía
ALTER TABLE roles ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES roles(id);

-- 5. Modificar usuarios
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS especialidad_id UUID REFERENCES especialidades(id),
ADD COLUMN IF NOT EXISTS epigrafe_iae_id UUID REFERENCES epigrafes_iae(id),
ADD COLUMN IF NOT EXISTS jefe_id UUID REFERENCES usuarios(id),  -- Jefe directo
ADD COLUMN IF NOT EXISTS es_practicas BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS fecha_contratacion DATE,
ADD COLUMN IF NOT EXISTS salario_base DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS es_pro BOOLEAN DEFAULT false,  -- Si tiene acceso PRO (lo gestiona el jefe mientras no haya pago)
ADD COLUMN IF NOT EXISTS taller_id UUID,  -- Para agrupar usuarios por taller
ADD COLUMN IF NOT EXISTS telefono TEXT,
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 6. Modificar configuracion para planes y límites
ALTER TABLE configuracion
ADD COLUMN IF NOT EXISTS precio_pro_mensual DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS precio_pro_anual DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS dias_prueba_pro INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS pro_activo BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS limite_usuarios_free INTEGER DEFAULT 3;

-- 7. Insertar especialidades iniciales
INSERT INTO especialidades (nombre, descripcion) VALUES
('MECANICA_GENERAL', 'Mecánica general de vehículos'),
('ELECTROMECANICA', 'Sistemas eléctricos y electrónicos'),
('CHAPA_Y_PINTURA', 'Carrocería y pintura'),
('ADMINISTRACION', 'Tareas administrativas y de oficina'),
('ALMACEN', 'Gestión de inventario y piezas'),
('PRACTICAS', 'Personal en formación')
ON CONFLICT (nombre) DO UPDATE SET descripcion = EXCLUDED.descripcion;

-- 8. Insertar epígrafes IAE iniciales
INSERT INTO epigrafes_iae (codigo, descripcion) VALUES
('691.1', 'Reparación de automóviles, bicicletas y otros vehículos'),
('691.2', 'Reparación de vehículos automóviles, bicicletas y otros vehículos (detallado)'),
('843.6', 'Talleres de chapa y pintura de vehículos')
ON CONFLICT (codigo) DO UPDATE SET descripcion = EXCLUDED.descripcion;

-- 9. Insertar permisos iniciales si no existen
INSERT INTO permisos (clave, descripcion) VALUES
('crear_presupuestos', 'Crear y editar presupuestos'),
('editar_precios', 'Modificar precios y tarifas'),
('aprobar_presupuestos', 'Aprobar presupuestos de clientes'),
('gestionar_citas', 'Crear, modificar y asignar citas'),
('crear_facturas', 'Emitir facturas a clientes'),
('enviar_gestoria', 'Exportar y enviar informes a gestoría'),
('gestionar_reparaciones', 'Actualizar estados y avances de reparación'),
('ver_balances', 'Ver balances, estadísticas y márgenes'),
('gestionar_proveedores', 'Gestionar proveedores y facturas recibidas'),
('gestionar_usuarios', 'Administrar empleados, roles y permisos'),
('configuracion_taller', 'Acceder y modificar configuración del taller')
ON CONFLICT (clave) DO UPDATE SET descripcion = EXCLUDED.descripcion;

-- 10. Insertar roles con jerarquía (ADMIN -> JEFE_TALLER -> ENCARGADOS -> OPERARIOS)
-- Nivel 0: ADMIN
INSERT INTO roles (nombre, descripcion, parent_id) VALUES
('ADMIN', 'Administrador del sistema', NULL)
ON CONFLICT (nombre) DO NOTHING;

-- Nivel 1: JEFE_TALLER
INSERT INTO roles (nombre, descripcion, parent_id) VALUES
('JEFE_TALLER', 'Jefe de taller', (SELECT id FROM roles WHERE nombre = 'ADMIN'))
ON CONFLICT (nombre) DO UPDATE SET parent_id = (SELECT id FROM roles WHERE nombre = 'ADMIN');

-- Nivel 2: ENCARGADOS & ÁREAS
INSERT INTO roles (nombre, descripcion, parent_id) VALUES
('ENCARGADO_MECANICA', 'Encargado de mecánica', (SELECT id FROM roles WHERE nombre = 'JEFE_TALLER')),
('ENCARGADO_ELECTROMECANICA', 'Encargado de electromecánica', (SELECT id FROM roles WHERE nombre = 'JEFE_TALLER')),
('ENCARGADO_CHAPA', 'Encargado de chapa', (SELECT id FROM roles WHERE nombre = 'JEFE_TALLER')),
('ENCARGADO_PINTURA', 'Encargado de pintura', (SELECT id FROM roles WHERE nombre = 'JEFE_TALLER')),
('ADMINISTRATIVO', 'Personal de administración', (SELECT id FROM roles WHERE nombre = 'JEFE_TALLER')),
('ALMACEN', 'Encargado de almacén', (SELECT id FROM roles WHERE nombre = 'JEFE_TALLER')),
('OPERARIO_PRACTICAS', 'Operario en prácticas', (SELECT id FROM roles WHERE nombre = 'JEFE_TALLER'))
ON CONFLICT (nombre) DO UPDATE SET parent_id = (SELECT id FROM roles WHERE nombre = 'JEFE_TALLER');

-- Nivel 3: OPERARIOS
INSERT INTO roles (nombre, descripcion, parent_id) VALUES
('OPERARIO_MECANICA', 'Operario de mecánica', (SELECT id FROM roles WHERE nombre = 'ENCARGADO_MECANICA')),
('OPERARIO_ELECTROMECANICA', 'Operario de electromecánica', (SELECT id FROM roles WHERE nombre = 'ENCARGADO_ELECTROMECANICA')),
('OPERARIO_CHAPA', 'Operario de chapa', (SELECT id FROM roles WHERE nombre = 'ENCARGADO_CHAPA')),
('OPERARIO_PINTURA', 'Operario de pintura', (SELECT id FROM roles WHERE nombre = 'ENCARGADO_PINTURA'))
ON CONFLICT (nombre) DO UPDATE SET parent_id = (
  CASE 
    WHEN nombre = 'OPERARIO_MECANICA' THEN (SELECT id FROM roles WHERE nombre = 'ENCARGADO_MECANICA')
    WHEN nombre = 'OPERARIO_ELECTROMECANICA' THEN (SELECT id FROM roles WHERE nombre = 'ENCARGADO_ELECTROMECANICA')
    WHEN nombre = 'OPERARIO_CHAPA' THEN (SELECT id FROM roles WHERE nombre = 'ENCARGADO_CHAPA')
    WHEN nombre = 'OPERARIO_PINTURA' THEN (SELECT id FROM roles WHERE nombre = 'ENCARGADO_PINTURA')
  END
);
