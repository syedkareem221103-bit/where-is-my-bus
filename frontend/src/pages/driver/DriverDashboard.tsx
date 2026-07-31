import { RouteCard } from '@/components/ui/route-card';
import { TripCard } from '@/components/ui/trip-card';
import { StudentCounter } from '@/components/ui/student-counter';
import { ProgressIndicator } from '@/components/ui/progress-indicator';
import { QuickActionCard } from '@/components/ui/quick-action-card';
import { EmergencyButton } from '@/components/ui/emergency-button';
import { Play, ClipboardList, AlertCircle, FileText } from 'lucide-react';

export function DriverDashboard() {
  return (
    <div className="space-y-8 pb-4">
      {/* Today's Work Section */}
      <section>
        <h2 className="text-xl font-bold tracking-tight mb-4 text-foreground">Today's Work</h2>
        <div className="space-y-4">
          <RouteCard 
            routeName="Morning Route A (North)" 
            startLocation="Main Depot" 
            endLocation="City High School" 
            estimatedTime="07:00 AM - 08:30 AM"
            isActive={true}
          />
          
          <h3 className="text-md font-semibold text-muted-foreground mt-4 mb-2">Upcoming Trips</h3>
          <div className="grid gap-3">
            <TripCard 
              title="Afternoon Dropoff - Route A" 
              time="03:15 PM" 
              studentCount={42} 
              status="pending" 
            />
          </div>
        </div>
      </section>

      {/* Today's Progress Section */}
      <section>
        <h2 className="text-xl font-bold tracking-tight mb-4 text-foreground">Today's Progress</h2>
        <div className="space-y-6 bg-card p-5 rounded-xl border shadow-sm">
          <StudentCounter current={15} total={42} label="Students Picked Up" />
          
          <div className="space-y-4 pt-2">
            <ProgressIndicator current={15} total={42} label="Pickup Progress" />
            <ProgressIndicator current={5} total={42} label="Dropoff Progress" />
          </div>
        </div>
      </section>

      {/* Quick Actions Section */}
      <section>
        <h2 className="text-xl font-bold tracking-tight mb-4 text-foreground">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <QuickActionCard 
            title="Start Trip" 
            icon={Play} 
            onClick={() => console.log('Start Trip')} 
          />
          <QuickActionCard 
            title="Manifest" 
            icon={ClipboardList} 
            onClick={() => console.log('Manifest')} 
          />
          <QuickActionCard 
            title="Report Issue" 
            icon={AlertCircle} 
            onClick={() => console.log('Report Issue')} 
          />
          <QuickActionCard 
            title="Log Book" 
            icon={FileText} 
            onClick={() => console.log('Log Book')} 
          />
        </div>
      </section>

      {/* Emergency Section */}
      <section className="pt-4">
        <h2 className="sr-only">Emergency</h2>
        <EmergencyButton onClick={() => console.log('Emergency Triggered')} />
      </section>
    </div>
  );
}
