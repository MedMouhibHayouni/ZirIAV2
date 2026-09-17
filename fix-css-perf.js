const fs = require('fs');

const files = [
  'src/app/features/dashboards/supplier/supplier-promotions.component.scss',
  'src/app/features/dashboards/supplier/supplier-catalog.component.scss',
  'src/app/features/dashboards/smsa/smsa-members.component.scss',
  'src/app/features/dashboards/farmer/farmer-diagnostic.component.scss',
  'src/app/features/dashboards/farmer/farmer-agent.component.scss',
  'src/app/features/dashboards/equipment/equipment-fleet.component.scss',
  'src/app/features/dashboards/ambassador/ambassador-shell.component.scss',
];

const base = 'd:/ZirIA/frontend/';

for (const f of files) {
  const path = base + f;
  if (!fs.existsSync(path)) { console.log('SKIP (not found):', f); continue; }
  let content = fs.readFileSync(path, 'utf8');
  const before = content;

  // Remove backdrop-filter lines (both prefixed and unprefixed)
  content = content.replace(/[ \t]*-webkit-backdrop-filter:[^\n;]+[;\n]/g, '\n');
  content = content.replace(/[ \t]*backdrop-filter:[^\n;]+[;\n]/g, '\n');

  // Replace transition: all X with specific properties (safer for layout)
  content = content.replace(/transition:\s*all\s+([\d.]+s[^;]*);/g, 'transition: background-color $1, transform $1, opacity $1, border-color $1;');

  if (content !== before) {
    fs.writeFileSync(path, content);
    console.log('Fixed:', f);
  } else {
    console.log('No changes:', f);
  }
}
console.log('Done');
