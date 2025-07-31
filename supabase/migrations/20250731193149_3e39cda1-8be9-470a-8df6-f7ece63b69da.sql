-- Update functions with proper search_path for security
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT role FROM public.profiles WHERE user_id = user_uuid;
$$;

CREATE OR REPLACE FUNCTION public.generate_patient_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_id TEXT;
BEGIN
  SELECT 'ER' || LPAD((COALESCE(MAX(CAST(SUBSTRING(patient_id FROM 3) AS INTEGER)), 0) + 1)::TEXT, 6, '0')
  INTO new_id
  FROM public.patients;
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_smartwatch_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_id TEXT;
BEGIN
  SELECT 'SW' || LPAD((COALESCE(MAX(CAST(SUBSTRING(smartwatch_id FROM 3) AS INTEGER)), 0) + 1)::TEXT, 6, '0')
  INTO new_id
  FROM public.patients;
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;