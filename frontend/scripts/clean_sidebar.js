const fs = require('fs');
let code = fs.readFileSync('components/shell/AppSidebar.tsx', 'utf8');
code = code.replace("import { usePortalTransition } from '@/components/portal/PortalTransitionProvider';\r\n", '');
code = code.replace("import { usePortalTransition } from '@/components/portal/PortalTransitionProvider';\n", '');
code = code.replace("  const { portalNavigate } = usePortalTransition();\r\n", '');
code = code.replace("  const { portalNavigate } = usePortalTransition();\n", '');
fs.writeFileSync('components/shell/AppSidebar.tsx', code, 'utf8');
console.log('Cleaned up AppSidebar.tsx');
