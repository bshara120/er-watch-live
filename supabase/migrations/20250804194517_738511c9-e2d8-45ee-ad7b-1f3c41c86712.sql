
-- Fix the RLS policy for inserting patients to use user_id instead of profile id
DROP POLICY IF EXISTS "Authenticated users can insert patients" ON public.patients;

CREATE POLICY "Authenticated users can insert patients" 
ON public.patients 
FOR INSERT 
WITH CHECK (auth.uid() = admitted_by);

-- Insert 10 demo patients
DO $$ 
DECLARE
  patient_ids TEXT[] := ARRAY[
    'ER000001', 'ER000002', 'ER000003', 'ER000004', 'ER000005',
    'ER000006', 'ER000007', 'ER000008', 'ER000009', 'ER000010'
  ];
  smartwatch_ids TEXT[] := ARRAY[
    'SW000001', 'SW000002', 'SW000003', 'SW000004', 'SW000005',
    'SW000006', 'SW000007', 'SW000008', 'SW000009', 'SW000010'
  ];
  names TEXT[] := ARRAY[
    'John Smith', 'Sarah Johnson', 'Michael Brown', 'Emily Davis', 'David Wilson',
    'Jessica Garcia', 'Christopher Miller', 'Ashley Rodriguez', 'Matthew Martinez', 'Amanda Anderson'
  ];
  national_ids TEXT[] := ARRAY[
    '123-45-6789', '987-65-4321', '456-78-9012', '321-54-9876', '654-32-1098',
    '789-01-2345', '012-34-5678', '345-67-8901', '678-90-1234', '901-23-4567'
  ];
  ages INTEGER[] := ARRAY[25, 34, 42, 28, 56, 31, 39, 45, 27, 52];
  demo_user_id UUID;
  i INTEGER;
BEGIN
  -- Get the first user from profiles to use as admitted_by
  SELECT user_id INTO demo_user_id FROM public.profiles LIMIT 1;
  
  -- If no user exists, create a placeholder (this shouldn't happen in normal use)
  IF demo_user_id IS NULL THEN
    demo_user_id := gen_random_uuid();
  END IF;
  
  -- Insert demo patients
  FOR i IN 1..10 LOOP
    INSERT INTO public.patients (
      patient_id,
      full_name,
      national_id,
      age,
      smartwatch_id,
      admitted_by
    ) VALUES (
      patient_ids[i],
      names[i],
      national_ids[i],
      ages[i],
      smartwatch_ids[i],
      demo_user_id
    ) ON CONFLICT (patient_id) DO NOTHING; -- Prevent duplicates if already exists
  END LOOP;
END $$;

-- Also insert some sample sensor data for the demo patients
INSERT INTO public.sensor_data (patient_id, bpm, so2, systolic_bp, diastolic_bp)
SELECT 
  p.id,
  60 + (random() * 40)::integer, -- BPM between 60-100
  95 + (random() * 5)::integer,  -- SO2 between 95-100
  110 + (random() * 30)::integer, -- Systolic BP between 110-140
  70 + (random() * 20)::integer   -- Diastolic BP between 70-90
FROM public.patients p
WHERE p.patient_id LIKE 'ER0000%'
ON CONFLICT DO NOTHING;
