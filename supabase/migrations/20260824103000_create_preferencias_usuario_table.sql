-- =============================================================================
-- MIGRACIÓN: Tabla preferencias_usuario
-- Separa la configuración global de la empresa de las preferencias personales
-- =============================================================================

CREATE TABLE IF NOT EXISTS preferencias_usuario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tema VARCHAR(20) DEFAULT 'claro',
    capa_visual VARCHAR(50) DEFAULT 'default',
    idioma VARCHAR(10) DEFAULT 'es',
    notificaciones JSONB DEFAULT '{"email": true, "push": false}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(usuario_id)
);

ALTER TABLE preferencias_usuario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_preferencias_usuario" ON preferencias_usuario;
CREATE POLICY "anon_select_preferencias_usuario" ON preferencias_usuario FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_preferencias_usuario" ON preferencias_usuario;
CREATE POLICY "anon_insert_preferencias_usuario" ON preferencias_usuario FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_preferencias_usuario" ON preferencias_usuario;
CREATE POLICY "anon_update_preferencias_usuario" ON preferencias_usuario FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_preferencias_usuario" ON preferencias_usuario;
CREATE POLICY "anon_delete_preferencias_usuario" ON preferencias_usuario FOR DELETE TO anon, authenticated USING (true);
