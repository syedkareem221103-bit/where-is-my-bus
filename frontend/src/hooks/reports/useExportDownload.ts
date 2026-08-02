import { useCallback, useState } from 'react';
import { useToast } from '../use-toast';

// In a real app this might be loaded from env, typically empty string for relative proxy
const API_BASE_URL = ''; 

export function useExportDownload() {
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();
  const authToken = localStorage.getItem('accessToken');

  const downloadReport = useCallback(async (tokenHash: string, format: string) => {
    setIsDownloading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/reports/download/${tokenHash}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Download failed or link expired');
      }

      // Convert to blob and trigger download prompt
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_export.${format.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: 'Download Complete',
        description: 'Report exported successfully.',
      });

    } catch (error) {
      toast({
        title: 'Download Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
    }
  }, [toast, authToken]);

  return { downloadReport, isDownloading };
}
