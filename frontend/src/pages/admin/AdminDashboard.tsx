import { PageHeader } from '@/components/ui/page-header';
import { SummaryCard } from '@/components/ui/summary-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Car, 
  Map, 
  MapPin, 
  AlertTriangle,
  GraduationCap,
  Plus,
  UserPlus,
  CarFront
} from 'lucide-react';

import { useDashboardStats } from '@/hooks/admin/useAdmin';

export function AdminDashboard() {
  const { data: stats, isLoading } = useDashboardStats();

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Dashboard" 
        description="Overview of your system's current status."
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard
          title="Total Students"
          value={isLoading ? "Loading..." : (stats?.totalStudents?.toString() || "0")}
          icon={GraduationCap}
        />
        <SummaryCard
          title="Total Drivers"
          value={isLoading ? "Loading..." : (stats?.totalDrivers?.toString() || "0")}
          icon={Users}
        />
        <SummaryCard
          title="Total Vehicles"
          value={isLoading ? "Loading..." : (stats?.totalVehicles?.toString() || "0")}
          icon={Car}
        />
        <SummaryCard
          title="Total Routes"
          value={isLoading ? "Loading..." : (stats?.totalRoutes?.toString() || "0")}
          icon={Map}
        />
        <SummaryCard
          title="Active Trips"
          value={isLoading ? "Loading..." : (stats?.activeTrips?.toString() || "0")}
          icon={MapPin}
        />
        <SummaryCard
          title="System Alerts"
          value={isLoading ? "Loading..." : (stats?.systemAlerts?.toString() || "0")}
          icon={AlertTriangle}
          className={stats?.systemAlerts && stats.systemAlerts > 0 ? "border-destructive/50" : ""}
        />
      </div>

      {/* Quick Actions and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Frequently used administrative tasks.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2">
              <UserPlus className="h-5 w-5" />
              <span>Add Student</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2">
              <UserPlus className="h-5 w-5" />
              <span>Add Driver</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2">
              <CarFront className="h-5 w-5" />
              <span>Add Vehicle</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2">
              <Map className="h-5 w-5" />
              <span>Create Route</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2 col-span-2">
              <Plus className="h-5 w-5" />
              <span>Create Trip</span>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest events in the system.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center p-8 text-muted-foreground border rounded-lg border-dashed">
              Activity feed placeholder
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
