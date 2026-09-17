const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.component.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // If it doesn't have OnPush
      if (content.includes('@Component(') && !content.includes('ChangeDetectionStrategy.OnPush')) {
        
        // 1. Add ChangeDetectionStrategy to @angular/core import
        if (!content.includes('ChangeDetectionStrategy')) {
            content = content.replace(/import\s+{([^}]*)}\s+from\s+['"]@angular\/core['"];/g, (match, p1) => {
                return `import { ${p1}, ChangeDetectionStrategy } from '@angular/core';`;
            });
        }
        
        // 2. Add changeDetection: ChangeDetectionStrategy.OnPush, inside @Component({
        content = content.replace(/@Component\(\s*{([\s\S]*?)}\s*\)/, (match, p1) => {
            return `@Component({\n  changeDetection: ChangeDetectionStrategy.OnPush,${p1}\n})`;
        });
        
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDir(path.join(__dirname, 'frontend/src/app'));
console.log('Done!');
