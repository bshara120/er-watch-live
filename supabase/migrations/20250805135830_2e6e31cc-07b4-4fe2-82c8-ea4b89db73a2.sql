-- Add new columns for body temperature and respiratory rate
ALTER TABLE public.sensor_data 
ADD COLUMN body_temp DECIMAL(4,1), -- Body temperature in Celsius (e.g., 36.5)
ADD COLUMN respiratory_rate INTEGER; -- Breaths per minute

-- Add some sample data for existing records
UPDATE public.sensor_data 
SET 
  body_temp = 36.0 + (random() * 2.5), -- Normal range 36.0-38.5°C
  respiratory_rate = 12 + (random() * 8)::integer -- Normal range 12-20 breaths/min
WHERE body_temp IS NULL;