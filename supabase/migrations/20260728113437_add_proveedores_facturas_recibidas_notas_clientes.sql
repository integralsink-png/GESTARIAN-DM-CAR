/*
# Add proveedores, facturas_recibidas, notas_vehiculo, and cliente_invitaciones tables

1. New Tables
- `proveedores`: suppliers/providers management
  - id (uuid PK), nombre, cif, direccion, telefono, email, contacto, created_at
- `facturas_recibidas`: invoices received from suppliers (RFP)
  - id (uuid PK), numero, proveedor_id (FK), fecha, base_imponible, iva, total, estado, archivo_url, conceptos (jsonb), created_at
- `notas_vehiculo`: notes attached to a vehicle (for client mode tracking)
  - id (uuid PK), vehiculo_id (FK), cliente_id (FK), autor, texto, created_at
- `cliente_invitaciones`: invitations sent to clients so they can download the app and track their vehicle
  - id (uuid PK), cliente_id (FK), vehiculo_id (FK), email, token, enviado (bool), created_at

2. Security
- Enable RLS on all new tables.
- Single-tenant app (no sign-in): allow anon + authenticated CRUD on all tables.
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS proveedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  cif text,
  direccion text,
  telefono text,
  email text,
  contacto text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_proveedores" ON proveedores;
CREATE POLICY "anon_select_proveedores" ON proveedores FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_proveedores" ON proveedores;
CREATE POLICY "anon_insert_proveedores" ON proveedores FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_proveedores" ON proveedores;
CREATE POLICY "anon_update_proveedores" ON proveedores FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_proveedores" ON proveedores;
CREATE POLICY "anon_delete_proveedores" ON proveedores FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS facturas_recibidas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL,
  proveedor_id uuid REFERENCES proveedores(id) ON DELETE SET NULL,
  fecha date DEFAULT now(),
  base_imponible numeric DEFAULT 0,
  iva numeric DEFAULT 0,
  total numeric DEFAULT 0,
  estado text DEFAULT 'pendiente',
  archivo_url text,
  conceptos jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE facturas_recibidas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_facturas_recibidas" ON facturas_recibidas;
CREATE POLICY "anon_select_facturas_recibidas" ON facturas_recibidas FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_facturas_recibidas" ON facturas_recibidas;
CREATE POLICY "anon_insert_facturas_recibidas" ON facturas_recibidas FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_facturas_recibidas" ON facturas_recibidas;
CREATE POLICY "anon_update_facturas_recibidas" ON facturas_recibidas FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_facturas_recibidas" ON facturas_recibidas;
CREATE POLICY "anon_delete_facturas_recibidas" ON facturas_recibidas FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS notas_vehiculo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehiculo_id uuid REFERENCES vehiculos(id) ON DELETE CASCADE,
  cliente_id uuid REFERENCES clientes(id) ON DELETE SET NULL,
  autor text DEFAULT 'Taller',
  texto text NOT NULL,
  visible_cliente boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notas_vehiculo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_notas_vehiculo" ON notas_vehiculo;
CREATE POLICY "anon_select_notas_vehiculo" ON notas_vehiculo FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_notas_vehiculo" ON notas_vehiculo;
CREATE POLICY "anon_insert_notas_vehiculo" ON notas_vehiculo FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_notas_vehiculo" ON notas_vehiculo;
CREATE POLICY "anon_update_notas_vehiculo" ON notas_vehiculo FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_notas_vehiculo" ON notas_vehiculo;
CREATE POLICY "anon_delete_notas_vehiculo" ON notas_vehiculo FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS cliente_invitaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid REFERENCES clientes(id) ON DELETE CASCADE,
  vehiculo_id uuid REFERENCES vehiculos(id) ON DELETE CASCADE,
  email text NOT NULL,
  token text UNIQUE NOT NULL DEFAULT md5(random()::text),
  enviado boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cliente_invitaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_cliente_invitaciones" ON cliente_invitaciones;
CREATE POLICY "anon_select_cliente_invitaciones" ON cliente_invitaciones FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_cliente_invitaciones" ON cliente_invitaciones;
CREATE POLICY "anon_insert_cliente_invitaciones" ON cliente_invitaciones FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_cliente_invitaciones" ON cliente_invitaciones;
CREATE POLICY "anon_update_cliente_invitaciones" ON cliente_invitaciones FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_cliente_invitaciones" ON cliente_invitaciones;
CREATE POLICY "anon_delete_cliente_invitaciones" ON cliente_invitaciones FOR DELETE
  TO anon, authenticated USING (true);
