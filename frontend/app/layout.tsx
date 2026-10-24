import type { Metadata } from 'next';
import './globals.css';
import { ChatbotWidget } from '@/components/chatbot/ChatbotWidget';

export const metadata: Metadata = {
  title: 'Darkhold Exchange — Simulated Festival Market',
  description: 'A simulated marketplace for festival passes and limited merch. All funds are simulated credits.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Manrope:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
        <ChatbotWidget />
      </body>
    </html>
  );
}
