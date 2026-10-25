const fs = require('fs');
let code = fs.readFileSync('app/portfolio/page.tsx', 'utf8');

code = code.replace(
  'navigator.clipboard?.writeText(text);',
  'if (typeof navigator !== \'undefined\' && navigator.clipboard) {\r\n      navigator.clipboard.writeText(text).catch(() => {});\r\n    }'
);
fs.writeFileSync('app/portfolio/page.tsx', code, 'utf8');
console.log('Safe clipboard handler added to app/portfolio/page.tsx');
