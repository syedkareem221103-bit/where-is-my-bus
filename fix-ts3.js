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
      
      // Fix AdminDashboard unused Skeleton and isError
      if (fullPath.includes('AdminDashboard.tsx')) {
         content = content.replace(/import \{ Skeleton \} from '@\/components\/ui\/skeleton';\n/, '');
         content = content.replace(/const \{ data: stats, isLoading, isError \} = useDashboardStats\(\);/, 'const { data: stats, isLoading } = useDashboardStats();');
      }

      // Fix unused args in hooks: onSuccess: (data, variables) => { ... } -> onSuccess: (_, variables) => { ... }
      if (fullPath.includes('/hooks/')) {
          content = content.replace(/onSuccess: \(data, variables\)/g, 'onSuccess: (_data, _variables)');
          content = content.replace(/onSuccess: \(data\)/g, 'onSuccess: ()');
          content = content.replace(/onError: \(error: any, variables, context: any\)/g, 'onError: (_error: any, _variables: any, _context: any)');
          content = content.replace(/onError: \(error: any\)/g, 'onError: (error: any)'); // this is used by toast
          content = content.replace(/onMutate: async \(payload\)/g, 'onMutate: async ()');
          content = content.replace(/payload\.status/g, 'variables.payload.status'); // In Trips/Emergency hooks
      }

      if (content !== fs.readFileSync(fullPath, 'utf8')) {
          fs.writeFileSync(fullPath, content);
      }
    }
  }
}

processDir(path.join(__dirname, 'frontend/src'));
