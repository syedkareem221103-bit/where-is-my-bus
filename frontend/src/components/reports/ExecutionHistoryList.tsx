import React from 'react';
import { useReportExecutions } from '../../hooks/reports/useReportExecutions';
import { useExportDownload } from '../../hooks/reports/useExportDownload';
import { Button } from '../ui/button';
import { DataTable } from '../ui/data-table';
import { format } from 'date-fns';
import { Download, Loader2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import type { ReportExecution } from '../../types/report';
import type { CellContext } from '@tanstack/react-table';

export const ExecutionHistoryList: React.FC = () => {
  const { data: executions, isLoading } = useReportExecutions();
  const { downloadReport, isDownloading } = useExportDownload();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS': return <Badge variant="default" className="bg-green-500">Success</Badge>;
      case 'FAILED': return <Badge variant="destructive">Failed</Badge>;
      case 'RUNNING': return <Badge variant="secondary">Running...</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const columns = [
    {
      accessorKey: 'createdAt',
      header: 'Date Executed',
      cell: ({ row }: CellContext<ReportExecution, unknown>) => format(new Date(row.original.createdAt), 'PP p'),
    },
    {
      accessorKey: 'reportType',
      header: 'Report',
      cell: ({ row }: CellContext<ReportExecution, unknown>) => row.original.subscription?.reportType || 'ON_DEMAND',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: CellContext<ReportExecution, unknown>) => getStatusBadge(row.original.status),
    },
    {
      id: 'actions',
      header: 'Download',
      cell: ({ row }: CellContext<ReportExecution, unknown>) => {
        const canDownload = row.original.status === 'SUCCESS' && row.original.tokenHash;
        return (
          <Button 
            variant="outline" 
            size="sm" 
            disabled={!canDownload || isDownloading}
            onClick={() => downloadReport(row.original.tokenHash!, row.original.subscription?.format || 'CSV')}
          >
            {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Download
          </Button>
        );
      },
    },
  ];

  if (isLoading) return <div>Loading history...</div>;

  return (
    <div className="space-y-4">
      <DataTable columns={columns} data={executions || []} />
    </div>
  );
};
