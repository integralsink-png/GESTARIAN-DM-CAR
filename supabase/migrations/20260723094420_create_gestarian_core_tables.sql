/*
# GESTARIAN — Tablas principales del flujo de trabajo

1. Tablas nuevas
- `clientes`: datos del cliente (nombre, DNI, teléfono, email, dirección)
- `vehiculos`: vehículos asociados a un cliente (matrícula, marca, modelo, año, VIN)
- `presupuestos`: presupuestos emitidos a un cliente+vehículo, con estado (pendiente/aceptado/rechazado) y conceptos en JSONB
- `citas`: citas del taller, vinculadas a un presupuesto aceptado, con estado (pendiente/confirmada/completada/cancelada)
- `reparaciones`: reparaciones en curso o finalizadas, vinculadas a una cita confirmada, con estado (en_proceso/finalizado)
- `facturas`: facturas emitidas, vinculadas a una reparación finalizada, con estado de cobro (pendiente/parcial/pagada)
- `cobros`: registro de abonos parciales sobre una factura

2. Seguridad
- Single-tenant sin auth: RLS habilitada en todas las tablas.
- Políticas TO anon, authenticated con USING (true) — los datos son intencionalmente públicos para la app sin login.
*/

-- ── CLIENTES ──
CREATE TABLE IF NOT EXISTS clientes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      text NOT NULL,
  dni         text,
  telefono    text,
  email       text,
  direccion   text,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_clientes" ON clientes;
CREATE POLICY "anon_select_clientes" ON clientes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_clientes" ON clientes FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_clientes" ON clientes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_clientes" ON clientes FOR DELETE TO anon, authenticated USING (true);

-- ── VEHICULOS ──
CREATE TABLE IF NOT EXISTS vehiculos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id  uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  matricula   text NOT NULL,
  marca       text,
  modelo      text,
  anio        int,
  vin         text,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE vehiculos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_vehiculos" ON vehiculos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_vehiculos" ON vehiculos FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_vehiculos" ON vehiculos FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_vehiculos" ON vehiculos FOR DELETE TO anon, authenticated USING (true);

-- ── PRESUPUESTOS ──
CREATE TABLE IF NOT EXISTS presupuestos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero        text NOT NULL DEFAULT '',
  cliente_id    uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  vehiculo_id   uuid REFERENCES vehiculos(id) ON DELETE SET NULL,
  estado        text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','aceptado','rechazado')),
  conceptos     jsonb NOT NULL DEFAULT '[]'::jsonb,
  total         numeric(10,2) NOT NULL DEFAULT 0,
  observaciones text,
  created_at    timestamptz DEFAULT now()
);
ALTER TABLE presupuestos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_presupuestos" ON presupuestos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_presupuestos" ON presupuestos FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_presupuestos" ON presupuestos FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_presupuestos" ON presupuestos FOR DELETE TO anon, authenticated USING (true);

-- ── CITAS ──
CREATE TABLE IF NOT EXISTS citas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  presupuesto_id  uuid REFERENCES presupuestos(id) ON DELETE SET NULL,
  cliente_id      uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  vehiculo_id     uuid REFERENCES vehiculos(id) ON DELETE SET NULL,
  fecha           date NOT NULL,
  hora            time,
  estado          text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','confirmada','completada','cancelada')),
  observaciones   text,
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE citas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_citas" ON citas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_citas" ON citas FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_citas" ON citas FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_citas" ON citas FOR DELETE TO anon, authenticated USING (true);

-- ── REPARACIONES ──
CREATE TABLE IF NOT EXISTS reparaciones (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cita_id     uuid REFERENCES citas(id) ON DELETE SET NULL,
  cliente_id  uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  vehiculo_id uuid REFERENCES vehiculos(id) ON DELETE SET NULL,
  estado      text NOT NULL DEFAULT 'en_proceso' CHECK (estado IN ('en_proceso','finalizado')),
  descripcion text,
  fotos       jsonb DEFAULT '[]'::jsonb,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE reparaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_reparaciones" ON reparaciones FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_reparaciones" ON reparaciones FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_reparaciones" ON reparaciones FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_reparaciones" ON reparaciones FOR DELETE TO anon, authenticated USING (true);

-- ── FACTURAS ──
CREATE TABLE IF NOT EXISTS facturas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero          text NOT NULL DEFAULT '',
  reparacion_id   uuid REFERENCES reparaciones(id) ON DELETE SET NULL,
  cliente_id      uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  vehiculo_id     uuid REFERENCES vehiculos(id) ON DELETE SET NULL,
  conceptos       jsonb NOT NULL DEFAULT '[]'::jsonb,
  total           numeric(10,2) NOT NULL DEFAULT 0,
  total_abonado   numeric(10,2) NOT NULL DEFAULT 0,
  estado_cobro    text NOT NULL DEFAULT 'pendiente' CHECK (estado_cobro IN ('pendiente','parcial','pagada')),
  fecha           date NOT NULL DEFAULT CURRENT_DATE,
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE facturas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_facturas" ON facturas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_facturas" ON facturas FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_facturas" ON facturas FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_facturas" ON facturas FOR DELETE TO anon, authenticated USING (true);

-- ── COBROS (abonos parciales) ──
CREATE TABLE IF NOT EXISTS cobros (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id  uuid NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  importe     numeric(10,2) NOT NULL,
  fecha       date NOT NULL DEFAULT CURRENT_DATE,
  metodo      text,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE cobros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_cobros" ON cobros FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_cobros" ON cobros FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_cobros" ON cobros FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_cobros" ON cobros FOR DELETE TO anon, authenticated USING (true);

-- ── ÍNDICES ──
CREATE INDEX IF NOT EXISTS idx_vehiculos_cliente ON vehiculos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_presupuestos_cliente ON presupuestos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_citas_cliente ON citas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_reparaciones_cliente ON reparaciones(cliente_id);
CREATE INDEX IF NOT EXISTS idx_facturas_cliente ON facturas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cobros_factura ON cobros(factura_id);
