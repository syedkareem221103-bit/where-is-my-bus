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
      
      // Fix imports from types directory
      const newContent = content.replace(/import\s+{([^}]+)}\s+from\s+['"](@\/types\/[^'"]+|(?:\.\/|\.\.\/)+[a-zA-Z0-9_\-.]+(?:\.dto)?)['"]/g, (match, imports, from) => {
         // If it's importing from a .dto or types directory, it's almost certainly types.
         // Let's just make it import type.
         if (from.includes('/types/') || from.includes('.dto')) {
            return `import type {${imports}} from '${from}'`;
         }
         return match;
      });

      if (newContent !== content) {
        fs.writeFileSync(fullPath, newContent);
        console.log('Fixed:', fullPath);
      }
    }
  }
}

processDir(path.join(__dirname, 'frontend/src'));
