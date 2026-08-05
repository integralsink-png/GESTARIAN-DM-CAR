/*
# Create vehicle_images table for storing photos linked to a license plate

1. New Tables
- `vehicle_images`: stores photos of vehicles, keyed by matricula (license plate).
  - `id` (uuid, primary key)
  - `matricula` (text, not null) — the license plate, used as the grouping key
  - `image_data` (text, not null) — base64 data URL of the image
  - `created_at` (timestamptz)
2. Security
- RLS enabled. Single-tenant app (no sign-in), so policies allow anon + authenticated CRUD.
3. Notes
- Images are stored as data URLs (base64) in the text column for simplicity.
- All photos for a given matricula can be retrieved with a single query.
*/

CREATE TABLE IF NOT EXISTS vehicle_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matricula text NOT NULL,
  image_data text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vehicle_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_vehicle_images" ON vehicle_images;
CREATE POLICY "anon_select_vehicle_images" ON vehicle_images FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_vehicle_images" ON vehicle_images;
CREATE POLICY "anon_insert_vehicle_images" ON vehicle_images FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_vehicle_images" ON vehicle_images;
CREATE POLICY "anon_delete_vehicle_images" ON vehicle_images FOR DELETE
TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_vehicle_images_matricula ON vehicle_images(matricula);
