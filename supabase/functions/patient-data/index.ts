import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

interface WatchDataPayload {
  device_id: string;
  timestamp: number;
  heart_rate: number;
  spo2?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get API key from header
    const apiKey = req.headers.get('x-api-key');
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Missing API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const payload: WatchDataPayload = await req.json();
    
    // Validate payload
    if (!payload.device_id || !payload.timestamp || !payload.heart_rate) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: device_id, timestamp, heart_rate' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify device API key
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('id, patient_id, is_active')
      .eq('device_id', payload.device_id)
      .eq('api_key', apiKey)
      .single();

    if (deviceError || !device) {
      console.error('Device authentication failed:', deviceError);
      return new Response(
        JSON.stringify({ error: 'Invalid device credentials' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!device.is_active) {
      return new Response(
        JSON.stringify({ error: 'Device is not active' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate timestamp (not more than 1 hour in the future or past)
    const now = Date.now();
    const timeDiff = Math.abs(now - payload.timestamp);
    if (timeDiff > 3600000) {
      console.warn(`Timestamp validation warning: ${timeDiff}ms difference`);
    }

    // Insert sensor data
    const { error: insertError } = await supabase
      .from('sensor_data')
      .insert({
        patient_id: device.patient_id,
        heart_rate: payload.heart_rate,
        oxygen_saturation: payload.spo2 || null,
        systolic_bp: null,
        diastolic_bp: null,
        body_temperature: null,
        respiratory_rate: null,
        timestamp: new Date(payload.timestamp).toISOString(),
      });

    if (insertError) {
      console.error('Failed to insert sensor data:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to store data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update device last sync time
    await supabase
      .from('devices')
      .update({ last_sync: new Date().toISOString() })
      .eq('id', device.id);

    // Check for alert conditions
    const alerts = [];
    
    if (payload.heart_rate > 120) {
      alerts.push({
        patient_id: device.patient_id,
        device_id: device.id,
        alert_type: 'high_heart_rate',
        severity: payload.heart_rate > 140 ? 'critical' : 'warning',
        message: `High heart rate detected: ${payload.heart_rate} bpm`,
        value: payload.heart_rate,
        threshold: 120,
      });
    }

    if (payload.spo2 && payload.spo2 < 92) {
      alerts.push({
        patient_id: device.patient_id,
        device_id: device.id,
        alert_type: 'low_spo2',
        severity: payload.spo2 < 88 ? 'critical' : 'warning',
        message: `Low oxygen saturation detected: ${payload.spo2}%`,
        value: payload.spo2,
        threshold: 92,
      });
    }

    // Insert alerts if any
    if (alerts.length > 0) {
      const { error: alertError } = await supabase
        .from('alerts')
        .insert(alerts);
      
      if (alertError) {
        console.error('Failed to insert alerts:', alertError);
      } else {
        console.log(`Generated ${alerts.length} alert(s) for patient ${device.patient_id}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Data received successfully',
        alerts_generated: alerts.length 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing patient data:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
