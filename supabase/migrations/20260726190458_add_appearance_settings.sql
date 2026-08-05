/*
# GESTARIAN — Apariencia visual y preferencias (animaciones / sonido)

1. Tabla modificada
- `configuracion`: se añaden columnas para personalización visual y preferencias de experiencia.
  - `color_fondo` (text): color de fondo de la aplicación. Default '#0a0e14'.
  - `color_texto` (text): color del texto principal. Default '#e2e8f0'.
  - `color_glow_botones` (text): color del efecto glow de los botones. Default '#06b6d4'.
  - `color_linea_botones` (text): color del borde/línea de los botones. Default '#0e7490'.
  - `color_relleno_campo` (text): color de relleno de los campos de formulario. Default '#0f1620'.
  - `animaciones_activadas` (boolean): activa/desactiva animaciones de la interfaz. Default true.
  - `sonido_activado` (boolean): activa/desactiva los efectos de sonido. Default true.

2. Seguridad
- No se modifican políticas. Las políticas existentes de `configuracion` siguen vigentes (anon, authenticated CRUD).
*/

ALTER TABLE configuracion
  ADD COLUMN IF NOT EXISTS color_fondo text DEFAULT '#0a0e14',
  ADD COLUMN IF NOT EXISTS color_texto text DEFAULT '#e2e8f0',
  ADD COLUMN IF NOT EXISTS color_glow_botones text DEFAULT '#06b6d4',
  ADD COLUMN IF NOT EXISTS color_linea_botones text DEFAULT '#0e7490',
  ADD COLUMN IF NOT EXISTS color_relleno_campo text DEFAULT '#0f1620',
  ADD COLUMN IF NOT EXISTS animaciones_activadas boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS sonido_activado boolean DEFAULT true;
