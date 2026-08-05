/*
# Create app_secrets table for storing API tokens server-side

1. New Tables
- `app_secrets`: stores third-party API tokens keyed by name.
  - `id` (uuid, primary key)
  - `name` (text, unique, not null) — e.g. "PLATE_RECOGNIZER_TOKEN"
  - `value` (text, not null) — the secret value
  - `created_at` (timestamptz)
2. Security
- RLS enabled. No policies added — only the service role (used by edge functions)
  can read/write this table. The anon key and authenticated users have zero access.
3. Notes
- This table is intentionally inaccessible from the frontend.
  Edge functions read it using the service role key, which bypasses RLS.
*/

CREATE TABLE IF NOT EXISTS app_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  value text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE app_secrets ENABLE ROW LEVEL SECURITY;

INSERT INTO app_secrets (name, value) VALUES ('PLATE_RECOGNIZER_TOKEN', '928ead1c82c78af71e76ad7ccb53563b7230d5c6')
ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value;
