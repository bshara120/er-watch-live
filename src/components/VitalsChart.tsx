import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface SensorData {
  id: string;
  patient_id: string;
  heart_rate: number | null;
  oxygen_saturation: number | null;
  systolic_bp: number | null;
  diastolic_bp: number | null;
  body_temperature: number | null;
  respiratory_rate: number | null;
  timestamp: string;
}

interface VitalsChartProps {
  data: SensorData[];
  height?: number;
}

const VitalsChart = ({ data, height = 300 }: VitalsChartProps) => {
  const chartData = data.map(item => ({
    time: new Date(item.timestamp).toLocaleTimeString(),
    heartRate: item.heart_rate,
    oxygenSat: item.oxygen_saturation,
    systolic: item.systolic_bp,
    diastolic: item.diastolic_bp,
    bodyTemp: item.body_temperature,
    respRate: item.respiratory_rate,
  }));

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="time" 
            fontSize={12}
            tick={{ fill: 'hsl(var(--foreground))' }}
          />
          <YAxis 
            fontSize={12}
            tick={{ fill: 'hsl(var(--foreground))' }}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px',
            }}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="heartRate" 
            stroke="hsl(var(--medical-danger))" 
            strokeWidth={2}
            name="Heart Rate (BPM)"
            connectNulls={false}
          />
          <Line 
            type="monotone" 
            dataKey="oxygenSat" 
            stroke="hsl(var(--medical-info))" 
            strokeWidth={2}
            name="Oxygen Saturation (%)"
            connectNulls={false}
          />
          <Line 
            type="monotone" 
            dataKey="systolic" 
            stroke="hsl(var(--medical-warning))" 
            strokeWidth={2}
            name="Systolic BP"
            connectNulls={false}
          />
          <Line 
            type="monotone" 
            dataKey="diastolic" 
            stroke="hsl(var(--medical-success))" 
            strokeWidth={2}
            name="Diastolic BP"
            connectNulls={false}
          />
          <Line 
            type="monotone" 
            dataKey="bodyTemp" 
            stroke="hsl(var(--medical-primary))" 
            strokeWidth={2}
            name="Body Temperature (°C)"
            connectNulls={false}
          />
          <Line 
            type="monotone" 
            dataKey="respRate" 
            stroke="#9333EA" 
            strokeWidth={2}
            name="Respiratory Rate (bpm)"
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default VitalsChart;