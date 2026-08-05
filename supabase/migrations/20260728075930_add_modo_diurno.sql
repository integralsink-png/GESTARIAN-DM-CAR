ALTER TABLE configuracion
  ADD COLUMN IF NOT EXISTS modo_diurno BOOLEAN DEFAULT false;
