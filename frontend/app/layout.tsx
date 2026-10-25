import type { Metadata } from 'next';
import './globals.css';
import { ChatbotWidget } from '@/components/chatbot/ChatbotWidget';
import { ToastRegion } from '@/components/shell/ToastRegion';
import { PortalTransitionProvider } from '@/components/portal/PortalTransitionProvider';
import { PortalLoadingScreen } from '@/components/portal/PortalLoadingScreen';

export const metadata: Metadata = {
  title: 'Darkhold Exchange — Simulated Festival Market',
  description: 'A simulated marketplace for festival passes and limited merch. All funds are simulated credits.',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Manrope:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body>
        <PortalTransitionProvider>
          {children}
          <PortalLoadingScreen />
          <ChatbotWidget />
          <ToastRegion />
        </PortalTransitionProvider>
      </body>
    </html>
  );
}
