/*
# GESTARIAN — Configuración, Usuarios y Roles

1. Tablas nuevas
- `configuracion`: fila única con datos de la empresa (nombre, CIF, dirección, teléfono, email, email_gestoria, logos, fondos de pantalla)
- `usuarios`: usuarios del sistema con rol (admin/jefe/operario) y permisos (puede_editar_precios, puede_enviar_gestoria)

2. Seguridad
- Single-tenant sin auth: RLS habilitada, políticas TO anon, authenticated.
*/

-- ── CONFIGURACION (fila única) ──
CREATE TABLE IF NOT EXISTS configuracion (
  id                  int PRIMARY KEY DEFAULT 1,
  nombre_empresa      text NOT NULL DEFAULT 'DM CAR',
  cif                 text NOT NULL DEFAULT 'B-12345678',
  direccion           text NOT NULL DEFAULT 'Polígono Industrial, Nave 7',
  telefono            text,
  email               text,
  email_gestoria      text,
  logo_color          text,
  logo_bn             text,
  fondo_landscape     text,
  fondo_portrait      text,
  CONSTRAINT solo_una_fila CHECK (id = 1)
);
ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_configuracion" ON configuracion FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_configuracion" ON configuracion FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_configuracion" ON configuracion FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_configuracion" ON configuracion FOR DELETE TO anon, authenticated USING (true);

-- Insertar fila por defecto si no existe
INSERT INTO configuracion (id) VALUES (1) ON CONFLICT DO NOTHING;

-- ── USUARIOS ──
CREATE TABLE IF NOT EXISTS usuarios (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre              text NOT NULL,
  email               text UNIQUE NOT NULL,
  rol                 text NOT NULL DEFAULT 'operario' CHECK (rol IN ('admin','jefe','operario')),
  puede_editar_precios boolean NOT NULL DEFAULT false,
  puede_enviar_gestoria boolean NOT NULL DEFAULT false,
  activo              boolean NOT NULL DEFAULT true,
  created_at          timestamptz DEFAULT now()
);
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_usuarios" ON usuarios FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_usuarios" ON usuarios FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_usuarios" ON usuarios FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_usuarios" ON usuarios FOR DELETE TO anon, authenticated USING (true);
