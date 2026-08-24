-- =============================================================================
-- MIGRACIÓN: Columnas de Notificaciones & WhatsApp en tabla configuracion
-- =============================================================================

ALTER TABLE configuracion
ADD COLUMN IF NOT EXISTS whatsapp_api_key TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_phone_number_id TEXT,
ADD COLUMN IF NOT EXISTS email_api_key TEXT,
ADD COLUMN IF NOT EXISTS email_from TEXT,
ADD COLUMN IF NOT EXISTS notificaciones_activas BOOLEAN DEFAULT false;
