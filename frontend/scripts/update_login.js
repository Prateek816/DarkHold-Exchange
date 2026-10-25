const fs = require('fs');

let content = fs.readFileSync('app/login/page.tsx', 'utf8');

if (!content.includes('usePortalTransition')) {
  content = content.replace(
    "import { useUserStore, useToastStore } from '@/lib/store';",
    "import { useUserStore, useToastStore } from '@/lib/store';\nimport { usePortalTransition } from '@/components/portal/PortalTransitionProvider';"
  );
  content = content.replace(
    "const router = useRouter();",
    "const router = useRouter();\n  const { signInTransition } = usePortalTransition();"
  );
  content = content.replaceAll(
    "router.push('/market');",
    "signInTransition('/market');"
  );
  fs.writeFileSync('app/login/page.tsx', content, 'utf8');
  console.log('Successfully updated app/login/page.tsx');
} else {
  console.log('Already updated');
}
