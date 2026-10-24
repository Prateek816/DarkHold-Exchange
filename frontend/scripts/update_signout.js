const fs = require('fs');

// 1. Update components/shell/AppTopBar.tsx
let topBar = fs.readFileSync('components/shell/AppTopBar.tsx', 'utf8');
topBar = topBar.replace(
  "portalNavigate('/', 'EXITING');",
  "portalNavigate('/login', 'SIGNING OUT');"
);
fs.writeFileSync('components/shell/AppTopBar.tsx', topBar, 'utf8');
console.log('Updated AppTopBar.tsx');

// 2. Update app/profile/page.tsx
let profile = fs.readFileSync('app/profile/page.tsx', 'utf8');
if (!profile.includes('usePortalTransition')) {
  profile = profile.replace(
    "import { useUserStore, useToastStore } from '@/lib/store';",
    "import { useUserStore, useToastStore } from '@/lib/store';\nimport { usePortalTransition } from '@/components/portal/PortalTransitionProvider';"
  );
  profile = profile.replace(
    "const router = useRouter();",
    "const router = useRouter();\n  const { signOutTransition } = usePortalTransition();"
  );
  profile = profile.replace(
    "router.push('/login');",
    "signOutTransition('/login');"
  );
  fs.writeFileSync('app/profile/page.tsx', profile, 'utf8');
  console.log('Updated app/profile/page.tsx');
}

// 3. Update components/shell/AppSidebar.tsx (Remove portalNavigate on brand logo link)
let sidebar = fs.readFileSync('components/shell/AppSidebar.tsx', 'utf8');
sidebar = sidebar.replace(
  `                onClick={(e) => {\n                  e.preventDefault();\n                  portalNavigate('/', 'EXITING');\n                }}`,
  `                onClick={() => setMobileOpen(false)}`
);
fs.writeFileSync('components/shell/AppSidebar.tsx', sidebar, 'utf8');
console.log('Updated AppSidebar.tsx');
