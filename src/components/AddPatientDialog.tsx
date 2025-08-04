import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AddPatientDialogProps {
  onPatientAdded: () => void;
}

const AddPatientDialog = ({ onPatientAdded }: AddPatientDialogProps) => {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [age, setAge] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setIsSubmitting(true);
    try {
      // Get the next patient ID and smartwatch ID
      const { data: patientIdData } = await supabase.rpc('generate_patient_id');
      const { data: smartwatchIdData } = await supabase.rpc('generate_smartwatch_id');

      const { error } = await supabase
        .from('patients')
        .insert({
          patient_id: patientIdData,
          full_name: fullName,
          national_id: nationalId,
          age: parseInt(age),
          smartwatch_id: smartwatchIdData,
          admitted_by: profile.id,
        });

      if (error) throw error;

      toast({
        title: "Patient Added",
        description: `${fullName} has been successfully added with ID: ${patientIdData}`,
      });

      // Reset form
      setFullName('');
      setNationalId('');
      setAge('');
      setOpen(false);
      onPatientAdded();

    } catch (error: any) {
      toast({
        title: "Error Adding Patient",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-medical-primary hover:bg-medical-primary/90">
          <Plus className="h-4 w-4 mr-2" />
          Add Patient
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Patient</DialogTitle>
          <DialogDescription>
            Enter patient information to register them in the ER system.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="nationalId">National ID Number</Label>
            <Input
              id="nationalId"
              placeholder="123-45-6789"
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="age">Age</Label>
            <Input
              id="age"
              type="number"
              placeholder="35"
              min="1"
              max="150"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-medical-primary hover:bg-medical-primary/90"
            >
              {isSubmitting ? 'Adding...' : 'Add Patient'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddPatientDialog;