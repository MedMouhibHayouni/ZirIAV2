const fs = require('fs');
const path = require('path');

function processDir(dirPath) {
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (file.endsWith('.component.ts')) {
      refactorComponent(fullPath);
    }
  }
}

function refactorComponent(tsFile) {
  let content = fs.readFileSync(tsFile, 'utf8');
  
  // Find template: `...` block
  // Using regex with a lazily captured group to find the template literal
  const templateRegex = /template:\s*`([\s\S]*?)`\s*(,|})/m;
  const match = content.match(templateRegex);
  
  if (match) {
    console.log(`Refactoring ${tsFile}...`);
    const templateContent = match[1].trim();
    
    // Determine filenames
    const baseName = tsFile.replace('.component.ts', '');
    const htmlName = `${baseName}.component.html`;
    const scssName = `${baseName}.component.scss`;
    
    const htmlBase = path.basename(htmlName);
    const scssBase = path.basename(scssName);
    
    // Write HTML
    fs.writeFileSync(htmlName, templateContent);
    // Touch SCSS
    if (!fs.existsSync(scssName)) {
      fs.writeFileSync(scssName, '');
    }
    
    // Replace in TS
    const replacement = `templateUrl: './${htmlBase}',\n  styleUrl: './${scssBase}'${match[2] === ',' ? ',' : '\n}'}`;
    content = content.replace(match[0], replacement);
    
    fs.writeFileSync(tsFile, content);
  }
}

const targetDir = path.join(__dirname, 'src', 'app');
processDir(targetDir);
console.log('Refactoring complete.');
