ALTER TABLE configuracion
  ADD COLUMN IF NOT EXISTS color_relleno_paneles TEXT DEFAULT '#2c2c2e';
