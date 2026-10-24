const fs = require('fs');
let code = fs.readFileSync('components/shell/AppSidebar.tsx', 'utf8');

// Replace the logo onClick
const target = `              <Link\r
                href="/"\r
                data-testid="brand-logo-link"\r
                onClick={(e) => {\r
                  e.preventDefault();\r
                  portalNavigate('/', 'EXITING');\r
                }}\r
                className={\`flex items-center gap-2.5 rounded-xl transition-all cursor-pointer group \${`;

const repl = `              <Link\r
                href="/"\r
                data-testid="brand-logo-link"\r
                onClick={() => setMobileOpen(false)}\r
                className={\`flex items-center gap-2.5 rounded-xl transition-all cursor-pointer group \${`;

if (code.includes("portalNavigate('/', 'EXITING')")) {
  code = code.replace(
    /onClick=\{\(e\) => \{\s*e\.preventDefault\(\);\s*portalNavigate\('\/', 'EXITING'\);\s*\}\}/,
    'onClick={() => setMobileOpen(false)}'
  );
  code = code.replace(
    'title="Darkhold Exchange (Click to exit to Public Portal)"',
    'title="Darkhold Exchange"'
  );
  fs.writeFileSync('components/shell/AppSidebar.tsx', code, 'utf8');
  console.log('AppSidebar brand logo link updated to immediate navigation');
} else {
  console.log('portalNavigate not found in AppSidebar');
}
