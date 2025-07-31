-- Create user roles enum
CREATE TYPE public.user_role AS ENUM ('doctor', 'nurse');

-- Create profiles table for user management
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create patients table
CREATE TABLE public.patients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  national_id TEXT NOT NULL UNIQUE,
  age INTEGER NOT NULL CHECK (age > 0 AND age < 150),
  smartwatch_id TEXT NOT NULL UNIQUE,
  admitted_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sensor data table for time-series data
CREATE TABLE public.sensor_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  bpm INTEGER,
  so2 INTEGER CHECK (so2 >= 0 AND so2 <= 100),
  systolic_bp INTEGER,
  diastolic_bp INTEGER,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create watchlist table for doctors
CREATE TABLE public.watchlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(doctor_id, patient_id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensor_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;

-- Create function to check user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE user_id = user_uuid;
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for patients (doctors and nurses can view all)
CREATE POLICY "Authenticated users can view patients" 
ON public.patients FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can insert patients" 
ON public.patients FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = admitted_by);

CREATE POLICY "Authenticated users can update patients" 
ON public.patients FOR UPDATE 
TO authenticated 
USING (true);

-- RLS Policies for sensor data
CREATE POLICY "Authenticated users can view sensor data" 
ON public.sensor_data FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "System can insert sensor data" 
ON public.sensor_data FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- RLS Policies for watchlist (only doctors)
CREATE POLICY "Doctors can manage their watchlist" 
ON public.watchlist FOR ALL 
TO authenticated 
USING (public.get_user_role(auth.uid()) = 'doctor' AND doctor_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Doctors can insert to their watchlist" 
ON public.watchlist FOR INSERT 
TO authenticated 
WITH CHECK (public.get_user_role(auth.uid()) = 'doctor' AND doctor_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Create function to auto-generate patient ID
CREATE OR REPLACE FUNCTION public.generate_patient_id()
RETURNS TEXT
LANGUAGE plpgsql
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

-- Create function to auto-generate smartwatch ID
CREATE OR REPLACE FUNCTION public.generate_smartwatch_id()
RETURNS TEXT
LANGUAGE plpgsql
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

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for sensor data
ALTER TABLE public.sensor_data REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sensor_data;

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Unknown User'),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'nurse'::user_role)
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();