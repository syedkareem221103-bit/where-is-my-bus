import React from 'react';
import { useReportSubscriptions } from '../../hooks/reports/useReportSubscriptions';
import { Button } from '../ui/button';
import { DataTable } from '../ui/data-table';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import type { ReportSubscription } from '../../types/report';
import type { CellContext } from '@tanstack/react-table';

export const SubscriptionList: React.FC = () => {
  const { data: subscriptions, isLoading, deleteSubscription } = useReportSubscriptions();
  const { toast } = useToast();

  const handleDelete = async (id: string) => {
    try {
      await deleteSubscription(id);
      toast({ title: 'Subscription Deleted' });
    } catch {
      toast({ title: 'Error deleting subscription', variant: 'destructive' });
    }
  };

  const columns = [
    {
      accessorKey: 'reportType',
      header: 'Report Type',
    },
    {
      accessorKey: 'frequency',
      header: 'Frequency',
    },
    {
      accessorKey: 'format',
      header: 'Format',
    },
    {
      accessorKey: 'nextRunAt',
      header: 'Next Run',
      cell: ({ row }: CellContext<ReportSubscription, unknown>) => format(new Date(row.original.nextRunAt), 'PP p'),
    },
    {
      accessorKey: 'targetEmails',
      header: 'Recipients',
      cell: ({ row }: CellContext<ReportSubscription, unknown>) => row.original.targetEmails.length + ' recipients',
    },
    {
      id: 'actions',
      cell: ({ row }: CellContext<ReportSubscription, unknown>) => (
        <Button variant="ghost" size="icon" onClick={() => handleDelete(row.original.id)}>
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      ),
    },
  ];

  if (isLoading) return <div>Loading subscriptions...</div>;

  return (
    <div className="space-y-4">
      <DataTable columns={columns} data={subscriptions || []} />
    </div>
  );
};
