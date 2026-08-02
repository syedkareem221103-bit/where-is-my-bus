import { PageHeader } from '@/components/ui/page-header';
import { useReportUIStore } from '../../store/useReportUIStore';
import { SubscriptionList } from '../../components/reports/SubscriptionList';
import { ExecutionHistoryList } from '../../components/reports/ExecutionHistoryList';
import { CreateSubscriptionModal } from '../../components/reports/CreateSubscriptionModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useGenerateReport } from '../../hooks/reports/useGenerateReport';
import { useToast } from '../../hooks/use-toast';
import { Loader2 } from 'lucide-react';

export function ReportsDashboard() {
  const { setCreateModalOpen, activeTab, setActiveTab } = useReportUIStore();
  const { mutateAsync: generateReport, isPending: isGenerating } = useGenerateReport();
  const { toast } = useToast();

  const handleOnDemand = async () => {
    try {
      await generateReport({ reportType: 'FLEET_UTILIZATION', format: 'CSV' });
      toast({ title: 'Report generated successfully', description: 'You can download it from the Execution History tab.' });
      setActiveTab('executions');
    } catch (e) {
      toast({ title: 'Generation Failed', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Reports" 
        description="Schedule automated reports or generate them on demand."
        actionLabel="Schedule Report"
        onAction={() => setCreateModalOpen(true)}
      />

      <div className="flex space-x-4 mb-4">
        <Button 
          variant={activeTab === 'subscriptions' ? 'default' : 'outline'}
          onClick={() => setActiveTab('subscriptions')}
        >
          Scheduled Reports
        </Button>
        <Button 
          variant={activeTab === 'executions' ? 'default' : 'outline'}
          onClick={() => setActiveTab('executions')}
        >
          Execution History
        </Button>
        <Button 
          variant="secondary"
          onClick={handleOnDemand}
          disabled={isGenerating}
        >
          {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Quick Export (Fleet CSV)
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {activeTab === 'subscriptions' && <SubscriptionList />}
          {activeTab === 'executions' && <ExecutionHistoryList />}
        </CardContent>
      </Card>

      <CreateSubscriptionModal />
    </div>
  );
}
