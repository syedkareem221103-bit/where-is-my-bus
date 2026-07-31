import { PageHeader } from '@/components/ui/page-header';
import { EmergencyButton } from '@/components/ui/emergency-button';

export function EmergencyActionPage() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Emergency Actions" 
        description="Trigger SOS protocols and alert administrators."
      />
      <div className="flex flex-col items-center justify-center p-8 border rounded-lg border-destructive/20 bg-destructive/5 text-center mt-8">
        <h3 className="text-lg font-bold text-destructive mb-2">Emergency SOS</h3>
        <p className="text-sm text-muted-foreground mb-8">
          Pressing the button below will immediately notify the school administration and operators of an emergency.
        </p>
        <EmergencyButton onClick={() => console.log('Emergency Triggered')} className="w-full sm:w-80" />
      </div>
    </div>
  );
}
