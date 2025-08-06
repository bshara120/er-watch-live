-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a cron job to run continuous sensor simulation every 5 seconds
SELECT cron.schedule(
  'continuous-sensor-simulation',
  '*/5 * * * * *',  -- Every 5 seconds
  $$
  SELECT
    net.http_post(
        url:='https://jtrattfpoyfojmfoqxoe.supabase.co/functions/v1/continuous-sensor-simulation',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0cmF0dGZwb3lmb2ptZm9xeG9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5ODk3NzgsImV4cCI6MjA2OTU2NTc3OH0.dlYN5x0q-sNzAaiy-TJjSzxhoSnXcN51CgXRTia-phs"}'::jsonb,
        body:='{"time": "' || now() || '"}'::jsonb
    ) as request_id;
  $$
);