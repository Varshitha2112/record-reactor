
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP POLICY IF EXISTS "Public read student files" ON storage.objects;

CREATE POLICY "Users read own files or admin"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'student-files' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin')
  )
);

-- Anonymous read for public photo display via public URL (photos placed under public/ subpath)
CREATE POLICY "Public read public subpath"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'student-files' AND (storage.foldername(name))[2] = 'public');
