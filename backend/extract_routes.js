const fs = require('fs');
const path = require('path');

function getFiles(dir, files = []) {
  const list = fs.readdirSync(dir);
  for (let file of list) {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      getFiles(file, files);
    } else if (file.endsWith('.controller.ts')) {
      files.push(file);
    }
  }
  return files;
}

const files = getFiles('d:/ZirIA/backend/src');
let output = [];

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  let currentController = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const ctrlMatch = line.match(/@Controller\(['"](.*)['"]\)/) || line.match(/@Controller\(\)/);
    if (ctrlMatch) {
      currentController = ctrlMatch[1] || '';
    }
    
    const methodMatch = line.match(/@(Get|Post|Patch|Delete|Put)\(['"](.*)['"]\)/) || line.match(/@(Get|Post|Patch|Delete|Put)\(\)/);
    if (methodMatch) {
      const httpMethod = methodMatch[1].toUpperCase();
      const routePath = methodMatch[2] || '';
      const fullPath = `/${currentController}${currentController && routePath ? '/' : ''}${routePath}`.replace(/\/+/g, '/');
      
      // Try to find method name
      let methodName = 'unknown';
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const m = lines[j].match(/(?:async\s+)?([a-zA-Z0-9_]+)\(/);
        if (m && !lines[j].includes('constructor')) {
          methodName = m[1];
          break;
        }
      }
      
      output.push(`[${httpMethod}] ${fullPath} - ${methodName} (${path.basename(file)})`);
    }
  }
});

fs.writeFileSync('d:/ZirIA/backend/routes_audit.txt', output.join('\n'));
console.log('Routes extracted successfully to d:/ZirIA/backend/routes_audit.txt');
