-- Create devices table for Galaxy Watch registration and API key management
CREATE TABLE public.devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text UNIQUE NOT NULL,
  api_key text UNIQUE NOT NULL,
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
  device_model text DEFAULT 'Galaxy Watch 6',
  is_active boolean DEFAULT true,
  last_sync timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on devices
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

-- RLS policies for devices
CREATE POLICY "Authenticated users can view devices"
  ON public.devices FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert devices"
  ON public.devices FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update devices"
  ON public.devices FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Create alerts table for logging threshold violations
CREATE TABLE public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  device_id uuid REFERENCES public.devices(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN ('high_heart_rate', 'low_spo2', 'high_bp', 'low_bp', 'high_temp', 'low_temp')),
  severity text NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  message text NOT NULL,
  value numeric NOT NULL,
  threshold numeric NOT NULL,
  is_acknowledged boolean DEFAULT false,
  acknowledged_by uuid REFERENCES public.profiles(user_id),
  acknowledged_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on alerts
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies for alerts
CREATE POLICY "Authenticated users can view alerts"
  ON public.alerts FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert alerts"
  ON public.alerts FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update alerts"
  ON public.alerts FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Add trigger for devices updated_at
CREATE TRIGGER update_devices_updated_at
  BEFORE UPDATE ON public.devices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index on sensor_data for better time-series query performance
CREATE INDEX IF NOT EXISTS idx_sensor_data_patient_timestamp 
  ON public.sensor_data(patient_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_sensor_data_timestamp 
  ON public.sensor_data(timestamp DESC);

-- Add index on alerts for better query performance
CREATE INDEX IF NOT EXISTS idx_alerts_patient_created 
  ON public.alerts(patient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_unacknowledged 
  ON public.alerts(is_acknowledged) WHERE is_acknowledged = false;

-- Enable realtime for alerts table (sensor_data already has it)
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;