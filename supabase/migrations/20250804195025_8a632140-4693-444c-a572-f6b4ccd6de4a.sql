-- Fix the RLS policy to use profile.id instead of auth.uid()
DROP POLICY IF EXISTS "Authenticated users can insert patients" ON public.patients;

CREATE POLICY "Authenticated users can insert patients" 
ON public.patients 
FOR INSERT 
WITH CHECK (admitted_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Insert 10 demo patients using the existing profile
INSERT INTO public.patients (
  patient_id,
  full_name,
  national_id,
  age,
  smartwatch_id,
  admitted_by
) VALUES
  ('ER000001', 'John Smith', '123-45-6789', 25, 'SW000001', 'f073854e-d0b6-43bb-8462-72030cf33b85'),
  ('ER000002', 'Sarah Johnson', '987-65-4321', 34, 'SW000002', 'f073854e-d0b6-43bb-8462-72030cf33b85'),
  ('ER000003', 'Michael Brown', '456-78-9012', 42, 'SW000003', 'f073854e-d0b6-43bb-8462-72030cf33b85'),
  ('ER000004', 'Emily Davis', '321-54-9876', 28, 'SW000004', 'f073854e-d0b6-43bb-8462-72030cf33b85'),
  ('ER000005', 'David Wilson', '654-32-1098', 56, 'SW000005', 'f073854e-d0b6-43bb-8462-72030cf33b85'),
  ('ER000006', 'Jessica Garcia', '789-01-2345', 31, 'SW000006', 'f073854e-d0b6-43bb-8462-72030cf33b85'),
  ('ER000007', 'Christopher Miller', '012-34-5678', 39, 'SW000007', 'f073854e-d0b6-43bb-8462-72030cf33b85'),
  ('ER000008', 'Ashley Rodriguez', '345-67-8901', 45, 'SW000008', 'f073854e-d0b6-43bb-8462-72030cf33b85'),
  ('ER000009', 'Matthew Martinez', '678-90-1234', 27, 'SW000009', 'f073854e-d0b6-43bb-8462-72030cf33b85'),
  ('ER000010', 'Amanda Anderson', '901-23-4567', 52, 'SW000010', 'f073854e-d0b6-43bb-8462-72030cf33b85')
ON CONFLICT (patient_id) DO NOTHING;

-- Insert sample sensor data for the demo patients
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