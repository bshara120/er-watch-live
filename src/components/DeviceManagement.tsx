import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Watch, Copy, Check } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Device {
  id: string;
  device_id: string;
  api_key: string;
  patient_id: string;
  device_model: string;
  is_active: boolean;
  last_sync: string | null;
  created_at: string;
}

interface Patient {
  id: string;
  full_name: string;
  patient_id: string;
}

const DeviceManagement = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [open, setOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    device_id: '',
    patient_id: '',
  });

  useEffect(() => {
    fetchDevices();
    fetchPatients();
  }, []);

  const fetchDevices = async () => {
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDevices(data || []);
    } catch (error) {
      console.error('Error fetching devices:', error);
    }
  };

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('id, full_name, patient_id')
        .order('full_name');

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const generateApiKey = () => {
    return 'gw6_' + crypto.randomUUID().replace(/-/g, '');
  };

  const registerDevice = async () => {
    if (!formData.device_id || !formData.patient_id) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const apiKey = generateApiKey();

      const { error } = await supabase.from('devices').insert({
        device_id: formData.device_id,
        api_key: apiKey,
        patient_id: formData.patient_id,
        device_model: 'Galaxy Watch 6',
        is_active: true,
      });

      if (error) throw error;

      toast({
        title: 'Device Registered',
        description: 'Galaxy Watch has been successfully registered',
      });

      setOpen(false);
      setFormData({ device_id: '', patient_id: '' });
      fetchDevices();
    } catch (error: any) {
      console.error('Error registering device:', error);
      toast({
        title: 'Registration Failed',
        description: error.message || 'Failed to register device',
        variant: 'destructive',
      });
    }
  };

  const copyToClipboard = (text: string, deviceId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(deviceId);
    setTimeout(() => setCopiedKey(null), 2000);
    toast({
      title: 'Copied',
      description: 'API key copied to clipboard',
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Watch className="h-5 w-5" />
            Galaxy Watch Devices
          </CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Register Device
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Register Galaxy Watch 6</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="device_id">Device ID</Label>
                  <Input
                    id="device_id"
                    placeholder="e.g., GW6-ABCD1234"
                    value={formData.device_id}
                    onChange={(e) =>
                      setFormData({ ...formData, device_id: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="patient_id">Patient</Label>
                  <Select
                    value={formData.patient_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, patient_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.full_name} ({patient.patient_id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={registerDevice} className="w-full">
                  Register Device
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {devices.length === 0 ? (
          <p className="text-sm text-muted-foreground">No devices registered</p>
        ) : (
          <div className="space-y-4">
            {devices.map((device) => (
              <div key={device.id} className="p-4 border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{device.device_id}</p>
                    <p className="text-xs text-muted-foreground">
                      {device.device_model}
                    </p>
                  </div>
                  <Badge variant={device.is_active ? 'default' : 'secondary'}>
                    {device.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2 bg-muted p-2 rounded">
                  <code className="text-xs flex-1 truncate">{device.api_key}</code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(device.api_key, device.device_id)}
                  >
                    {copiedKey === device.device_id ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {device.last_sync && (
                  <p className="text-xs text-muted-foreground">
                    Last sync: {new Date(device.last_sync).toLocaleString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DeviceManagement;
