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
      
      // Revert _data, _variables, _payload
      content = content.replace(/_data/g, 'data');
      content = content.replace(/_variables/g, 'variables');
      content = content.replace(/_payload/g, 'payload');
      content = content.replace(/_context/g, 'context');
      
      // Fix AdminDashboard
      if (fullPath.includes('AdminDashboard.tsx')) {
         content = content.replace(/value=\{isLoading \? <Skeleton className="h-6 w-16" \/> : \(stats\?\.([a-zA-Z]+)\?\.toString\(\) \|\| "0"\)\}/g, 'value={isLoading ? "Loading..." : (stats?.$1?.toString() || "0")}');
      }

      // Fix Lists LoadingSkeleton
      if (fullPath.includes('UsersList.tsx') || fullPath.includes('DriversList.tsx')) {
         content = content.replace(/<LoadingSkeleton/g, '<div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>{/*');
         content = content.replace(/rows=\{5\} \/>/g, 'rows={5} />*/}');
      }

      fs.writeFileSync(fullPath, content);
    }
  }
}

processDir(path.join(__dirname, 'frontend/src'));
