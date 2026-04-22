-- 1. Fix profiles table: restrict SELECT to self or admin
DROP POLICY IF EXISTS "Profiles readable by authenticated" ON public.profiles;

CREATE POLICY "Users read own profile or admin reads all"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 2. Remove email-based admin bootstrap from handle_new_user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));

  -- Default everyone to student. Admins must be promoted manually.
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student');

  RETURN NEW;
END;
$function$;

-- 3. Add explicit restrictive INSERT policy on user_roles so only admins can grant roles
CREATE POLICY "Only admins can insert roles"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Make student-files bucket private and remove public-subpath read policy
UPDATE storage.buckets SET public = false WHERE id = 'student-files';

DROP POLICY IF EXISTS "Public read public subpath" ON storage.objects;

-- Ensure authenticated users can read their own files and admins can read all
CREATE POLICY "Users read own student files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'student-files'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin')
    )
  );