ALTER TABLE configuracion
  ADD COLUMN IF NOT EXISTS tipo_empresa TEXT DEFAULT 'autonomo';
