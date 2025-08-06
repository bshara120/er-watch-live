import { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { LogOut, Search, Users, Activity, Heart, Stethoscope, Star, Play, Pause } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import PatientCard from '@/components/PatientCard';
import AddPatientDialog from '@/components/AddPatientDialog';
import PatientDetailsDialog from '@/components/PatientDetailsDialog';

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
  body_temp: number | null;
  respiratory_rate: number | null;
  timestamp: string;
}

const Dashboard = () => {
  const { user, profile, signOut, loading } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [latestVitals, setLatestVitals] = useState<Record<string, SensorData>>({});
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showWatchlistOnly, setShowWatchlistOnly] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [patientsLoading, setPatientsLoading] = useState(true);

  // Define functions with useCallback to prevent dependency issues
  const filterPatients = useCallback(() => {
    let filtered = patients;

    if (searchTerm) {
      filtered = filtered.filter(patient =>
        patient.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.patient_id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (showWatchlistOnly && profile?.role === 'doctor') {
      filtered = filtered.filter(patient => watchlist.includes(patient.id));
    }

    setFilteredPatients(filtered);
  }, [patients, searchTerm, showWatchlistOnly, watchlist, profile?.role]);

  const fetchPatients = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPatients(data || []);
      
      // Fetch latest vitals for each patient
      if (data && data.length > 0) {
        const vitalsPromises = data.map(async (patient) => {
          const { data: vitals } = await supabase
            .from('sensor_data')
            .select('*')
            .eq('patient_id', patient.id)
            .order('timestamp', { ascending: false })
            .limit(1)
            .single();
          
          return { patientId: patient.id, vitals };
        });

        const vitalsResults = await Promise.all(vitalsPromises);
        const vitalsMap: Record<string, SensorData> = {};
        vitalsResults.forEach(({ patientId, vitals }) => {
          if (vitals) {
            vitalsMap[patientId] = vitals;
          }
        });
        setLatestVitals(vitalsMap);
      }
    } catch (error: any) {
      toast({
        title: "Error Fetching Patients",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setPatientsLoading(false);
    }
  }, []);

  const fetchWatchlist = useCallback(async () => {
    if (profile?.role !== 'doctor') return;

    try {
      const { data, error } = await supabase
        .from('watchlist')
        .select('patient_id')
        .eq('doctor_id', profile.id);

      if (error) throw error;

      setWatchlist(data?.map(item => item.patient_id) || []);
    } catch (error: any) {
      console.error('Error fetching watchlist:', error);
    }
  }, [profile?.role, profile?.id]);

  const setupRealtimeSubscription = useCallback(() => {
    const channel = supabase
      .channel('sensor-data-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sensor_data'
        },
        (payload) => {
          const newVitals = payload.new as SensorData;
          setLatestVitals(prev => ({
            ...prev,
            [newVitals.patient_id]: newVitals
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // All hooks must be called before any early returns
  useEffect(() => {
    if (user && profile) {
      fetchPatients();
      fetchWatchlist();
      setupRealtimeSubscription();
    }
  }, [user, profile, fetchPatients, fetchWatchlist, setupRealtimeSubscription]);

  useEffect(() => {
    filterPatients();
  }, [filterPatients]);

  // Redirect if not authenticated
  if (!user && !loading) {
    return <Navigate to="/auth" replace />;
  }

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-medical-primary/10 to-medical-info/10">
        <div className="animate-pulse flex items-center gap-2">
          <Activity className="h-8 w-8 text-medical-primary" />
          <span className="text-lg font-semibold">Loading Dashboard...</span>
        </div>
      </div>
    );
  }

  const toggleSimulation = async () => {
    try {
      if (isSimulationRunning) {
        const { error } = await supabase.functions.invoke('stop-sensor-simulation');
        if (error) throw error;
        setIsSimulationRunning(false);
        toast({
          title: "Simulation Stopped",
          description: "Sensor data simulation has been stopped.",
        });
      } else {
        const { error } = await supabase.functions.invoke('start-sensor-simulation');
        if (error) throw error;
        setIsSimulationRunning(true);
        toast({
          title: "Simulation Started",
          description: "Sensor data simulation is now running.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Simulation Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-medical-primary/5 to-medical-info/5">
      {/* Header */}
      <header className="bg-white border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-medical-primary rounded-full">
                  <Heart className="h-5 w-5 text-white" />
                </div>
                <div className="p-2 bg-medical-info rounded-full">
                  <Stethoscope className="h-5 w-5 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-medical-primary">ER Watch</h1>
                <p className="text-sm text-muted-foreground">Emergency Room Monitoring</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium">{profile.full_name}</p>
                <Badge variant={profile.role === 'doctor' ? 'default' : 'secondary'}>
                  {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                </Badge>
              </div>
              <Button
                variant="outline"
                onClick={signOut}
                className="text-muted-foreground hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Controls */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search patients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full sm:w-64"
              />
            </div>
            
            {profile.role === 'doctor' && (
              <div className="flex items-center space-x-2">
                <Switch
                  id="watchlist-only"
                  checked={showWatchlistOnly}
                  onCheckedChange={setShowWatchlistOnly}
                />
                <Label htmlFor="watchlist-only" className="flex items-center gap-1">
                  <Star className="h-4 w-4" />
                  Watchlist Only
                </Label>
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={isSimulationRunning ? "destructive" : "default"}
              onClick={toggleSimulation}
              className="flex items-center gap-2"
            >
              {isSimulationRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {isSimulationRunning ? 'Stop' : 'Start'} Simulation
            </Button>
            <AddPatientDialog onPatientAdded={fetchPatients} />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{patients.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Monitors</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Object.keys(latestVitals).length}</div>
            </CardContent>
          </Card>
          
          {profile.role === 'doctor' && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Watchlist</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{watchlist.length}</div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Patients Grid */}
        {patientsLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded"></div>
                    <div className="h-3 bg-muted rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredPatients.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center h-64">
              <div className="text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No patients found</p>
                <p className="text-sm">
                  {searchTerm
                    ? 'Try adjusting your search terms'
                    : showWatchlistOnly
                    ? 'No patients in your watchlist'
                    : 'Add a patient to get started'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredPatients.map((patient) => (
              <div
                key={patient.id}
                className="cursor-pointer"
                onClick={() => setSelectedPatient(patient)}
              >
                <PatientCard
                  patient={patient}
                  latestVitals={latestVitals[patient.id] || null}
                  isWatchlisted={watchlist.includes(patient.id)}
                  onWatchlistChange={fetchWatchlist}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Patient Details Dialog */}
      <PatientDetailsDialog
        patient={selectedPatient}
        open={!!selectedPatient}
        onOpenChange={(open) => !open && setSelectedPatient(null)}
      />
    </div>
  );
};

export default Dashboard;