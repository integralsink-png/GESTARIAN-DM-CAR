ALTER TABLE configuracion
  ADD COLUMN IF NOT EXISTS color_relleno_botones text DEFAULT 'transparent';
