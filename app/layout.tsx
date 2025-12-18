import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter, Outfit } from 'next/font/google';
import { Toaster } from '@/components/Toaster';
import ErrorBoundary from '@/components/ErrorBoundary';
import ServiceWorkerManager from '@/components/ServiceWorkerManager';
import TokenExpiryNotifier from '@/components/TokenExpiryNotifier';
import AuthInitializer from '@/components/AuthInitializer';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

// PWA Ready - Vercel Production Build
export const metadata: Metadata = {
  title: 'Descongelado',
  description: 'Sistema de control de calidad para análisis de productos en descongelado - Aquagold',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Descongelado',
  },
  icons: {
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' }
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
    ],
    shortcut: '/favicon-32x32.png'
  },
};

export const viewport: Viewport = {
  themeColor: '#06b6d4',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${inter.variable} ${outfit.variable} antialiased`}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
        <Toaster />
        <TokenExpiryNotifier />
        <AuthInitializer />
        <ServiceWorkerManager />
      </body>
    </html>
  )
}
