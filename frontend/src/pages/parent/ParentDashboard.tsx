import { ChildInfoCard } from '@/components/ui/child-info-card';
import { AttendanceStatusCard } from '@/components/ui/attendance-status-card';
import { TripSummaryCard } from '@/components/ui/trip-summary-card';
import { BusInfoCard } from '@/components/ui/bus-info-card';
import { DriverInfoCard } from '@/components/ui/driver-info-card';
import { NotificationCard } from '@/components/ui/notification-card';
import { QuickActionCard } from '@/components/ui/quick-action-card';
import { PhoneCall, CalendarDays, MapPin, Settings } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function ParentDashboard() {
  return (
    <div className="space-y-8 pb-4">
      {/* Child Status Section */}
      <section>
        <h2 className="text-xl font-bold tracking-tight mb-4 text-foreground">Child Status</h2>
        <div className="space-y-4">
          <ChildInfoCard name="John Doe" grade="5th Grade" assignedRoute="Morning Route A (North)" />
          <AttendanceStatusCard status="boarded" timestamp="Today at 07:15 AM" />
          <TripSummaryCard 
            routeName="Morning Route A" 
            status="in_progress" 
            eta="08:10 AM" 
            progressPercentage={65} 
          />
        </div>
      </section>

      {/* Transportation Section */}
      <section>
        <h2 className="text-xl font-bold tracking-tight mb-4 text-foreground">Transportation</h2>
        <div className="space-y-4">
          <BusInfoCard busNumber="42" plate="XYZ-1234" color="Yellow" />
          <DriverInfoCard name="Michael Smith" phonePlaceholder="(555) 123-4567" />
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4 flex flex-col justify-center items-center text-center">
                <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Pickup</span>
                <span className="text-lg font-bold">07:10 AM</span>
                <span className="text-xs text-green-500 font-semibold mt-1">On Time</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex flex-col justify-center items-center text-center">
                <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Dropoff</span>
                <span className="text-lg font-bold">08:15 AM</span>
                <span className="text-xs text-muted-foreground font-semibold mt-1">Est. Time</span>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Alerts Section */}
      <section>
        <h2 className="text-xl font-bold tracking-tight mb-4 text-foreground">Alerts</h2>
        <div className="space-y-3">
          <NotificationCard 
            type="info"
            title="Bus Approaching"
            message="Bus 42 is 5 minutes away from the pickup stop."
            time="10 min ago"
            isRead={false}
          />
        </div>
      </section>

      {/* Quick Actions Section */}
      <section>
        <h2 className="text-xl font-bold tracking-tight mb-4 text-foreground">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <QuickActionCard title="Contact School" icon={PhoneCall} onClick={() => console.log('Contact School')} />
          <QuickActionCard title="Attendance" icon={CalendarDays} onClick={() => console.log('Attendance')} />
          <QuickActionCard title="View Trip" icon={MapPin} onClick={() => console.log('View Trip')} />
          <QuickActionCard title="Settings" icon={Settings} onClick={() => console.log('Settings')} />
        </div>
      </section>
    </div>
  );
}
