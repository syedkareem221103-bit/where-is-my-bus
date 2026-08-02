import React, { useState } from 'react';
import { useReportUIStore } from '../../store/useReportUIStore';
import { useReportSubscriptions } from '../../hooks/reports/useReportSubscriptions';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { useToast } from '../../hooks/use-toast';
import type { ReportType, ReportFrequency, ReportFormat } from '../../types/report';

export const CreateSubscriptionModal: React.FC = () => {
  const { isCreateModalOpen, setCreateModalOpen } = useReportUIStore();
  const { createSubscription, isCreating } = useReportSubscriptions();
  const { toast } = useToast();

  const [reportType, setReportType] = useState<ReportType>('FLEET_UTILIZATION');
  const [frequency, setFrequency] = useState<ReportFrequency>('WEEKLY');
  const [format, setFormat] = useState<ReportFormat>('CSV');
  const [emails, setEmails] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmails = emails.split(',').map(e => e.trim()).filter(e => e.length > 0);
    
    if (targetEmails.length === 0) {
      toast({ title: 'Error', description: 'Please enter at least one valid email', variant: 'destructive' });
      return;
    }

    try {
      await createSubscription({
        reportType,
        frequency,
        format,
        targetEmails,
      });
      toast({ title: 'Success', description: 'Report subscription created.' });
      setCreateModalOpen(false);
    } catch (err) {
      toast({ title: 'Failed to create subscription', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={isCreateModalOpen} onOpenChange={setCreateModalOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule Automated Report</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Report Type</label>
            <select className="w-full border rounded p-2" value={reportType} onChange={e => setReportType(e.target.value as ReportType)}>
              <option value="FLEET_UTILIZATION">Fleet Utilization</option>
              <option value="ATTENDANCE_SUMMARY">Attendance Summary</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Frequency</label>
            <select className="w-full border rounded p-2" value={frequency} onChange={e => setFrequency(e.target.value as ReportFrequency)}>
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Format</label>
            <select className="w-full border rounded p-2" value={format} onChange={e => setFormat(e.target.value as ReportFormat)}>
              <option value="CSV">CSV</option>
              <option value="JSON">JSON</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Recipients (comma separated)</label>
            <input 
              type="text" 
              className="w-full border rounded p-2" 
              value={emails} 
              onChange={e => setEmails(e.target.value)} 
              placeholder="admin@school.edu, transport@school.edu" 
              required
            />
          </div>
          <div className="flex justify-end pt-4">
            <Button type="button" variant="outline" className="mr-2" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? 'Saving...' : 'Create Schedule'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
