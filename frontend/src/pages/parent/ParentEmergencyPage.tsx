import { PageHeader } from '@/components/ui/page-header';
import { EmergencyContactCard } from '@/components/ui/emergency-contact-card';

export function ParentEmergencyPage() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Emergency Contacts" 
        description="Important numbers to call in case of an emergency."
      />
      <div className="space-y-4">
        <EmergencyContactCard 
          title="School Administration" 
          phoneNumber="(555) 010-0001" 
          description="Main office for general emergencies." 
        />
        <EmergencyContactCard 
          title="Transport Operator" 
          phoneNumber="(555) 010-0002" 
          description="Direct line to the bus fleet manager." 
        />
      </div>
    </div>
  );
}
