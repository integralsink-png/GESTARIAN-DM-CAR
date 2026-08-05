/*
# Bucket de Storage para PDFs de Presupuestos y Facturas

1. Objetivo
- Alojar los PDF generados (presupuestos y facturas) en un bucket público
  para poder compartir una URL directa de descarga por WhatsApp (enlace
  "VER PRESUPUESTO" / "VER FACTURA" en el mensaje).

2. Seguridad
- Bucket público de solo lectura para cualquiera con el enlace (necesario
  para que WhatsApp pueda mostrar/descargar el documento).
- Escritura (subida) permitida a anon/authenticated, en línea con el resto
  de la app (single-tenant sin auth).
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos-pdf', 'documentos-pdf', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "anon_select_documentos_pdf" ON storage.objects;
CREATE POLICY "anon_select_documentos_pdf"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'documentos-pdf');

DROP POLICY IF EXISTS "anon_insert_documentos_pdf" ON storage.objects;
CREATE POLICY "anon_insert_documentos_pdf"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'documentos-pdf');

DROP POLICY IF EXISTS "anon_update_documentos_pdf" ON storage.objects;
CREATE POLICY "anon_update_documentos_pdf"
  ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (bucket_id = 'documentos-pdf')
  WITH CHECK (bucket_id = 'documentos-pdf');
