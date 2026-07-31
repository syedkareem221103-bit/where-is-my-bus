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
      let modified = false;
      
      // Fix unused variables in hooks (data, variables, payload, error)
      if (fullPath.includes('/hooks/')) {
         content = content.replace(/onSuccess: \(([^)]+)\)/g, (match, args) => {
            return `onSuccess: (${args.split(',').map(a => a.trim().startsWith('_') ? a.trim() : `_${a.trim()}`).join(', ')})`;
         });
         content = content.replace(/onError: \(([^)]+)\)/g, (match, args) => {
            return `onError: (${args.split(',').map(a => {
               const arg = a.trim();
               if(arg === 'error: any' || arg.startsWith('_')) return arg;
               return `_${arg}`;
            }).join(', ')})`;
         });
         content = content.replace(/onMutate: async \(([^)]+)\)/g, (match, args) => {
             return `onMutate: async (${args.split(',').map(a => a.trim().startsWith('_') ? a.trim() : `_${a.trim()}`).join(', ')})`;
         });
         content = content.replace(/_error: any/g, 'error: any'); // Leave error as is
      }
      
      // Fix trips hook unused TripStatus
      if (fullPath.endsWith('useTrips.ts')) {
         content = content.replace(/, TripStatus } from/g, ' } from');
      }

      // Fix UsersList and DriversList props
      if (fullPath.includes('UsersList.tsx') || fullPath.includes('DriversList.tsx')) {
         // Fix LoadingSkeleton import
         content = content.replace(/import { LoadingSkeleton } from '@\/components\/ui\/loading-skeleton';/g, 'import { Skeleton } from \'@/components/ui/skeleton\';');
         content = content.replace(/<LoadingSkeleton type="list" rows={5} \/>/g, '<div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>');
         
         // Remove unsupported DataTable props
         content = content.replace(/keyExtractor=\{\(item\) => item\.id\}/g, '');
         content = content.replace(/onRowClick=\{\(item\) => console\.log\("Clicked [a-z]+", item\.id\)\}/g, '');
      }

      if (content !== fs.readFileSync(fullPath, 'utf8')) {
        fs.writeFileSync(fullPath, content);
        console.log('Fixed:', fullPath);
      }
    }
  }
}

processDir(path.join(__dirname, 'frontend/src'));
