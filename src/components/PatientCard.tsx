import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heart, Droplets, Activity, Clock, Star, StarOff, Thermometer, Wind } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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

interface PatientCardProps {
  patient: Patient;
  latestVitals: SensorData | null;
  isWatchlisted?: boolean;
  onWatchlistChange?: () => void;
}

const PatientCard = ({ patient, latestVitals, isWatchlisted = false, onWatchlistChange }: PatientCardProps) => {
  const { profile } = useAuth();
  const [isUpdatingWatchlist, setIsUpdatingWatchlist] = useState(false);

  const getVitalStatus = (value: number | null, normal: [number, number]) => {
    if (value === null) return 'unknown';
    if (value < normal[0] || value > normal[1]) return 'danger';
    if (value <= normal[0] + 10 || value >= normal[1] - 10) return 'warning';
    return 'success';
  };

  const bpmStatus = getVitalStatus(latestVitals?.bpm || null, [60, 100]);
  const so2Status = getVitalStatus(latestVitals?.so2 || null, [95, 100]);
  const bpStatus = getVitalStatus(latestVitals?.systolic_bp || null, [90, 140]);
  const tempStatus = getVitalStatus(latestVitals?.body_temp || null, [36.0, 38.0]);
  const respStatus = getVitalStatus(latestVitals?.respiratory_rate || null, [12, 20]);

  const handleWatchlistToggle = async () => {
    if (!profile || profile.role !== 'doctor') return;

    setIsUpdatingWatchlist(true);
    try {
      if (isWatchlisted) {
        // Remove from watchlist
        const { error } = await supabase
          .from('watchlist')
          .delete()
          .eq('doctor_id', profile.id)
          .eq('patient_id', patient.id);

        if (error) throw error;

        toast({
          title: "Removed from Watchlist",
          description: `${patient.full_name} has been removed from your watchlist.`,
        });
      } else {
        // Add to watchlist
        const { error } = await supabase
          .from('watchlist')
          .insert({
            doctor_id: profile.id,
            patient_id: patient.id,
          });

        if (error) throw error;

        toast({
          title: "Added to Watchlist",
          description: `${patient.full_name} has been added to your watchlist.`,
        });
      }

      onWatchlistChange?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingWatchlist(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'medical-success';
      case 'warning': return 'medical-warning';
      case 'danger': return 'medical-danger';
      default: return 'muted';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'danger': return 'destructive';
      case 'warning': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">{patient.full_name}</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <span>ID: {patient.patient_id}</span>
              <span>•</span>
              <span>Age: {patient.age}</span>
              <span>•</span>
              <span>Watch: {patient.smartwatch_id}</span>
            </div>
          </div>
          {profile?.role === 'doctor' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleWatchlistToggle}
              disabled={isUpdatingWatchlist}
              className="p-2"
            >
              {isWatchlisted ? (
                <Star className="h-4 w-4 fill-medical-warning text-medical-warning" />
              ) : (
                <StarOff className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <Heart className={`h-4 w-4 text-${getStatusColor(bpmStatus)}`} />
            <div>
              <div className="text-sm font-medium">
                {latestVitals?.bpm || 'N/A'} BPM
              </div>
              <Badge variant={getStatusBadgeVariant(bpmStatus)} className="text-xs">
                Heart Rate
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Droplets className={`h-4 w-4 text-${getStatusColor(so2Status)}`} />
            <div>
              <div className="text-sm font-medium">
                {latestVitals?.so2 || 'N/A'}%
              </div>
              <Badge variant={getStatusBadgeVariant(so2Status)} className="text-xs">
                Oxygen
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Activity className={`h-4 w-4 text-${getStatusColor(bpStatus)}`} />
            <div>
              <div className="text-sm font-medium">
                {latestVitals?.systolic_bp && latestVitals?.diastolic_bp 
                  ? `${latestVitals.systolic_bp}/${latestVitals.diastolic_bp}`
                  : 'N/A'
                }
              </div>
              <Badge variant={getStatusBadgeVariant(bpStatus)} className="text-xs">
                Blood Pressure
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Thermometer className={`h-4 w-4 text-${getStatusColor(tempStatus)}`} />
            <div>
              <div className="text-sm font-medium">
                {latestVitals?.body_temp || 'N/A'}°C
              </div>
              <Badge variant={getStatusBadgeVariant(tempStatus)} className="text-xs">
                Body Temp
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Wind className={`h-4 w-4 text-${getStatusColor(respStatus)}`} />
            <div>
              <div className="text-sm font-medium">
                {latestVitals?.respiratory_rate || 'N/A'} bpm
              </div>
              <Badge variant={getStatusBadgeVariant(respStatus)} className="text-xs">
                Respiratory
              </Badge>
            </div>
          </div>
        </div>
        
        {latestVitals && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-3">
            <Clock className="h-3 w-3" />
            <span>Last update: {new Date(latestVitals.timestamp).toLocaleTimeString()}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PatientCard;