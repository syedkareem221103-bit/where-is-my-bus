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
      
      // Fix hooks that lost their variables
      if (fullPath.includes('/hooks/')) {
          content = content.replace(/onSuccess: \(\)/g, 'onSuccess: (data)');
          content = content.replace(/onSuccess: \(_data, _variables\)/g, 'onSuccess: (data, variables)');
          content = content.replace(/onError: \(_error: any, _variables: any, _context: any\)/g, 'onError: (error: any, variables, context: any)');
          content = content.replace(/onMutate: async \(\)/g, 'onMutate: async (payload)');
      }

      if (content !== fs.readFileSync(fullPath, 'utf8')) {
          fs.writeFileSync(fullPath, content);
      }
    }
  }
}

processDir(path.join(__dirname, 'frontend/src'));
