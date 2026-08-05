CREATE TABLE IF NOT EXISTS theme_settings (
  id integer PRIMARY KEY DEFAULT 1,
  theme_preset text DEFAULT 'classic',
  primary_color text DEFAULT '#0f172a',
  secondary_color text DEFAULT '#334155',
  button_color text DEFAULT '#3b82f6',
  icon_color text DEFAULT '#64748b',
  warning_color text DEFAULT '#f59e0b',
  success_color text DEFAULT '#10b981',
  error_color text DEFAULT '#ef4444',
  is_dark_mode boolean DEFAULT true,
  card_color text DEFAULT '#1e293b',
  dashboard_color text DEFAULT '#0f172a',
  table_color text DEFAULT '#1e293b',
  header_color text DEFAULT '#0f172a',
  typography text DEFAULT 'Inter',
  font_size text DEFAULT '14px',
  border_radius text DEFAULT '0.5rem',
  shadows text DEFAULT 'md',
  spacing text DEFAULT 'normal',
  visual_density text DEFAULT 'normal',
  
  logo_url text,
  logo_inicio_url text,
  dashboard_image_url text,
  background_image_url text,
  favicon_url text,
  commercial_name text,
  splash_screen_url text,
  pwa_icon_url text,
  notification_color text DEFAULT '#3b82f6',
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

INSERT INTO theme_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
