import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Droplets, Activity, User, Clock, Smartphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import VitalsChart from './VitalsChart';

interface Patient {
  id: string;
  patient_id: string;
  full_name: string;
  national_id: string;
  age: number;
  smartwatch_id: string;
  created_at: string;
}

interface SensorData {
  id: string;
  patient_id: string;
  bpm: number | null;
  so2: number | null;
  systolic_bp: number | null;
  diastolic_bp: number | null;
  timestamp: string;
}

interface PatientDetailsDialogProps {
  patient: Patient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PatientDetailsDialog = ({ patient, open, onOpenChange }: PatientDetailsDialogProps) => {
  const [vitalsHistory, setVitalsHistory] = useState<SensorData[]>([]);
  const [latestVitals, setLatestVitals] = useState<SensorData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (patient && open) {
      fetchVitalsData();
    }
  }, [patient, open]);

  const fetchVitalsData = async () => {
    if (!patient) return;
    
    setLoading(true);
    try {
      // Fetch latest vitals
      const { data: latest } = await supabase
        .from('sensor_data')
        .select('*')
        .eq('patient_id', patient.id)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (latest) {
        setLatestVitals(latest);
      }

      // Fetch vitals history (last 24 hours)
      const { data: history } = await supabase
        .from('sensor_data')
        .select('*')
        .eq('patient_id', patient.id)
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('timestamp', { ascending: true });

      if (history) {
        setVitalsHistory(history);
      }
    } catch (error) {
      console.error('Error fetching vitals data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!patient) return null;

  const getVitalStatus = (value: number | null, normal: [number, number]) => {
    if (value === null) return 'muted';
    if (value < normal[0] || value > normal[1]) return 'medical-danger';
    if (value <= normal[0] + 10 || value >= normal[1] - 10) return 'medical-warning';
    return 'medical-success';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {patient.full_name}
          </DialogTitle>
          <DialogDescription>
            Patient ID: {patient.patient_id} • National ID: {patient.national_id}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="vitals">Live Vitals</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Patient Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Age:</span>
                    <span className="text-sm font-medium">{patient.age} years</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Admitted:</span>
                    <span className="text-sm font-medium">
                      {new Date(patient.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Smartwatch:</span>
                    <Badge variant="outline" className="text-xs">
                      <Smartphone className="h-3 w-3 mr-1" />
                      {patient.smartwatch_id}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Current Status</CardTitle>
                </CardHeader>
                <CardContent>
                  {latestVitals ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Heart className={`h-4 w-4 text-${getVitalStatus(latestVitals.bpm, [60, 100])}`} />
                          <span className="text-sm">Heart Rate</span>
                        </div>
                        <span className="text-sm font-medium">{latestVitals.bpm || 'N/A'} BPM</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Droplets className={`h-4 w-4 text-${getVitalStatus(latestVitals.so2, [95, 100])}`} />
                          <span className="text-sm">Oxygen</span>
                        </div>
                        <span className="text-sm font-medium">{latestVitals.so2 || 'N/A'}%</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Activity className={`h-4 w-4 text-${getVitalStatus(latestVitals.systolic_bp, [90, 140])}`} />
                          <span className="text-sm">Blood Pressure</span>
                        </div>
                        <span className="text-sm font-medium">
                          {latestVitals.systolic_bp && latestVitals.diastolic_bp 
                            ? `${latestVitals.systolic_bp}/${latestVitals.diastolic_bp}`
                            : 'N/A'
                          }
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1 text-xs text-muted-foreground pt-2">
                        <Clock className="h-3 w-3" />
                        <span>Last update: {new Date(latestVitals.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No vitals data available</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="vitals" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Real-time Vitals Monitoring</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-pulse">Loading vitals data...</div>
                  </div>
                ) : vitalsHistory.length > 0 ? (
                  <VitalsChart data={vitalsHistory.slice(-20)} height={400} />
                ) : (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    No vitals data available for the last 24 hours
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>24-Hour Vitals History</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-pulse">Loading history...</div>
                  </div>
                ) : vitalsHistory.length > 0 ? (
                  <VitalsChart data={vitalsHistory} height={400} />
                ) : (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    No vitals history available
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default PatientDetailsDialog;