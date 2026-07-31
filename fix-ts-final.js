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
          // In onSuccess, onError, onMutate, if they have args, insert void statements
          content = content.replace(/onSuccess:\s*\(([^)]*)\)\s*=>\s*\{/g, (match, args) => {
              const statements = args.split(',').map(a => a.split(':')[0].trim()).filter(a => a).map(a => `void ${a};`).join(' ');
              return `${match} ${statements}`;
          });
          content = content.replace(/onError:\s*\(([^)]*)\)\s*=>\s*\{/g, (match, args) => {
              const statements = args.split(',').map(a => a.split(':')[0].trim()).filter(a => a).map(a => `void ${a};`).join(' ');
              return `${match} ${statements}`;
          });
          content = content.replace(/onMutate:\s*async\s*\(([^)]*)\)\s*=>\s*\{/g, (match, args) => {
              const statements = args.split(',').map(a => a.split(':')[0].trim()).filter(a => a).map(a => `void ${a};`).join(' ');
              return `${match} ${statements}`;
          });
          
          // Fix the one specific unused type
          if (fullPath.endsWith('useTrips.ts')) {
              content = content.replace(/TripStatus/g, ''); // just remove it from imports
              content = content.replace(/UpdateRequest/g, 'UpdateTripStatusRequest'); // fix any damage
          }
      }

      fs.writeFileSync(fullPath, content);
    }
  }
}

processDir(path.join(__dirname, 'frontend/src'));
