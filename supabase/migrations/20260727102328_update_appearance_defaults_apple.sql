/*
# GESTARIAN — Actualizar defaults de apariencia (estilo Apple)

1. Tabla modificada
- `configuracion`: se actualizan los valores por defecto de las columnas de apariencia
  para reflejar el nuevo diseño visual corporativo.
  - `color_fondo`: '#1c1c1e' (gris oscuro Apple)
  - `color_texto`: '#f5f5f7' (blanco casi puro)
  - `color_glow_botones`: '#40e0d0' (turquesa claro)
  - `color_linea_botones`: '#8e8e93' (gris sistema)
  - `color_relleno_campo`: '#2c2c2e' (gris oscuro para campos)

2. Seguridad
- No se modifican políticas existentes.
*/

UPDATE configuracion
SET
  color_fondo = COALESCE(color_fondo, '#1c1c1e'),
  color_texto = COALESCE(color_texto, '#f5f5f7'),
  color_glow_botones = COALESCE(color_glow_botones, '#40e0d0'),
  color_linea_botones = COALESCE(color_linea_botones, '#8e8e93'),
  color_relleno_campo = COALESCE(color_relleno_campo, '#2c2c2e')
WHERE id = 1;

ALTER TABLE configuracion
  ALTER COLUMN color_fondo SET DEFAULT '#1c1c1e',
  ALTER COLUMN color_texto SET DEFAULT '#f5f5f7',
  ALTER COLUMN color_glow_botones SET DEFAULT '#40e0d0',
  ALTER COLUMN color_linea_botones SET DEFAULT '#8e8e93',
  ALTER COLUMN color_relleno_campo SET DEFAULT '#2c2c2e';
