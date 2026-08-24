-- =============================================================================
-- MIGRACIÓN: Tabla para Likes / Favoritos de Imágenes de Clientes
-- =============================================================================

CREATE TABLE IF NOT EXISTS imagenes_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imagen_url TEXT NOT NULL,
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  vehiculo_id UUID REFERENCES vehiculos(id) ON DELETE CASCADE,
  liked BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_cliente_imagen UNIQUE (cliente_id, imagen_url)
);

-- Habilitar RLS
ALTER TABLE imagenes_likes ENABLE ROW LEVEL SECURITY;

-- Políticas para acceso público / cliente
CREATE POLICY "Permitir lectura publica imagenes_likes" ON imagenes_likes
  FOR SELECT USING (true);

CREATE POLICY "Permitir insertar/modificar imagenes_likes" ON imagenes_likes
  FOR ALL USING (true) WITH CHECK (true);
