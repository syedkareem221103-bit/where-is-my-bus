const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      if (fullPath.includes('/hooks/')) {
          // Replace error: any with error: unknown in onError callbacks
          content = content.replace(/error: any/g, 'error: unknown');
          
          // Fix context: any in useNotifications
          content = content.replace(/context: any/g, 'context: { previousState?: unknown } | undefined');
          
          // Add inline cast for error to access response.data.message
          content = content.replace(/error\.response\?\.data\?\.message/g, '(error as { response?: { data?: { message?: string } } }).response?.data?.message');
      }
      
      // Fix trip.service.ts
      if (fullPath.endsWith('trip.service.ts')) {
          content = content.replace(/catch \(error: any\)/g, 'catch (error: unknown)');
          content = content.replace(/error\.response\?\.status/g, '(error as { response?: { status?: number } }).response?.status');
      }

      // Fix organization.dto.ts
      if (fullPath.endsWith('organization.dto.ts')) {
          content = content.replace(/routeSettings: any/g, 'routeSettings: Record<string, unknown>');
          content = content.replace(/notifySettings: any/g, 'notifySettings: Record<string, unknown>');
          content = content.replace(/operatingSchedule: any/g, 'operatingSchedule: Record<string, unknown>');
      }

      // Fix notification.dto.ts
      if (fullPath.endsWith('notification.dto.ts')) {
          content = content.replace(/payload: any/g, 'payload: Record<string, unknown>');
      }

      if (content !== fs.readFileSync(fullPath, 'utf8')) {
          fs.writeFileSync(fullPath, content);
          console.log(`Fixed any in ${fullPath}`);
      }
    }
  }
}

processDir(path.join(__dirname, 'frontend/src'));
