import * as fs from 'fs';
import * as path from 'path';

describe('Sprint 2 — Institution Privacy Architecture Boundary Test (Rule 2.1)', () => {
  const FORBIDDEN_MODULE_PATTERNS = [
    { name: 'ERP / Inventory', regex: /from\s+['"].*(\/inventory\/|\/erp\/).*['"]/i },
    { name: 'Marketplace', regex: /from\s+['"].*\/marketplace\/.*['"]/i },
    { name: 'User Wallet / Finance', regex: /from\s+['"].*(\/finance\/|\/wallet).*['"]/i },
    { name: 'Third-Party Messaging', regex: /from\s+['"].*\/messages\/.*['"]/i },
    { name: 'ZiriAgent Conversations', regex: /from\s+['"].*(\/ai\/.*agent|\/ziriagent).*['"]/i },
  ];

  function getAllTsFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
    const files = fs.readdirSync(dirPath);
    files.forEach((file) => {
      const fullPath = path.join(dirPath, file);
      if (fs.statSync(fullPath).isDirectory()) {
        getAllTsFiles(fullPath, arrayOfFiles);
      } else if (file.endsWith('.ts') && !file.endsWith('.spec.ts')) {
        arrayOfFiles.push(fullPath);
      }
    });
    return arrayOfFiles;
  }

  it('should PASS when no institution source file imports forbidden ERP/Marketplace/Wallet/Messaging modules', () => {
    const institutionsDir = path.join(__dirname, '../../institutions');
    const tsFiles = getAllTsFiles(institutionsDir);

    const violations: Array<{ file: string; forbiddenRule: string; line: string }> = [];

    for (const filePath of tsFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        for (const rule of FORBIDDEN_MODULE_PATTERNS) {
          if (rule.regex.test(line)) {
            violations.push({
              file: path.basename(filePath),
              forbiddenRule: rule.name,
              line: `L${index + 1}: ${line.trim()}`,
            });
          }
        }
      });
    }

    expect(violations).toEqual([]);
  });
});
