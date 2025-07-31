import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Patient {
  id: string;
  patient_id: string;
  full_name: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all patients
    const { data: patients, error: patientsError } = await supabaseClient
      .from('patients')
      .select('id, patient_id, full_name');

    if (patientsError) {
      throw patientsError;
    }

    if (!patients || patients.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No patients found to simulate data for' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Generate random but realistic sensor data
    const generateVitals = () => {
      // Normal ranges with some variation
      const baseHR = 70 + Math.random() * 20; // 70-90 baseline
      const baseSO2 = 96 + Math.random() * 3; // 96-99 baseline
      const baseSystolic = 110 + Math.random() * 20; // 110-130 baseline
      const baseDiastolic = 70 + Math.random() * 15; // 70-85 baseline

      // Add some random variation (±10%)
      const variation = 0.9 + Math.random() * 0.2;
      
      return {
        bpm: Math.round(baseHR * variation),
        so2: Math.min(100, Math.round(baseSO2 * variation)),
        systolic_bp: Math.round(baseSystolic * variation),
        diastolic_bp: Math.round(baseDiastolic * variation),
      };
    };

    // Insert sensor data for each patient
    const insertPromises = patients.map(async (patient: Patient) => {
      const vitals = generateVitals();
      
      const { error } = await supabaseClient
        .from('sensor_data')
        .insert({
          patient_id: patient.id,
          bpm: vitals.bpm,
          so2: vitals.so2,
          systolic_bp: vitals.systolic_bp,
          diastolic_bp: vitals.diastolic_bp,
          timestamp: new Date().toISOString(),
        });

      if (error) {
        console.error(`Error inserting data for patient ${patient.patient_id}:`, error);
        return { patient: patient.patient_id, success: false, error: error.message };
      }

      console.log(`Generated vitals for ${patient.full_name} (${patient.patient_id}):`, vitals);
      return { patient: patient.patient_id, success: true, vitals };
    });

    const results = await Promise.all(insertPromises);
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`Sensor simulation completed: ${successful} successful, ${failed} failed`);

    return new Response(
      JSON.stringify({
        message: `Sensor data generated for ${successful} patients`,
        successful,
        failed,
        results: results.map(r => ({
          patient: r.patient,
          success: r.success,
          vitals: r.success ? (r as any).vitals : undefined,
          error: !r.success ? (r as any).error : undefined,
        })),
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in sensor simulation:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate sensor data',
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});