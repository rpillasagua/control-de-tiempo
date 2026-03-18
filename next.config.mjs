import withPWAInit from '@ducanh2912/next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  // Rehabilitado para compilación en Vercel
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,

  // IMPORTANTE: Hemos removido buildExcludes y publicExcludes porque
  // causaban que el runtime de Webpack de Next.js 15 colapsara (TypeError: reading 'call')
  // al intentar pre-renderizar las rutas estáticas durante el 'next build'.

  // 🔄 FALLBACKS: Páginas offline cuando no hay conexión
  fallbacks: {
    document: '/_offline', // Página offline para rutas HTML
  },

  runtimeCaching: [
    // 📊 FIRESTORE: Análisis y datos de la app (NetworkFirst con mejor offline support)
    {
      urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'firestore-cache',
        expiration: {
          maxEntries: 100, // Más análisis cacheados
          maxAgeSeconds: 7 * 24 * 60 * 60 // 7 días para análisis históricos
        },
        networkTimeoutSeconds: 3 // Respuesta más rápida offline
      }
    },
    {
      urlPattern: /^https:\/\/lh3\.googleusercontent\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-images',
        expiration: {
          maxEntries: 100, // Increased from 60
          maxAgeSeconds: 30 * 24 * 60 * 60 // 30 días
        }
      }
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-images',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 30 * 24 * 60 * 60
        }
      }
    },

  ]
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ignorar ESLint durante build
  eslint: {
    ignoreDuringBuilds: true,
  },

  // NOTE: output: 'export' removed — dynamic routes [id] require server mode.

  images: {
    unoptimized: true,
    formats: ['image/avif', 'image/webp'], // Formatos modernos
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },

  // ⚡ PERFORMANCE OPTIMIZATIONS
  poweredByHeader: false, // Quitar header X-Powered-By por seguridad

  // Permitir conexiones desde la red local
  allowedDevOrigins: ['192.168.100.174'],

  // Configuración de trailing slash para compatibilidad
  trailingSlash: true,

  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      // Configuración del cliente para SPA
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };

      // ⚡ OPTIMIZATION: Code splitting mejorado
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk para librerías grandes
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20
            },
            // Firebase en chunk separado
            firebase: {
              name: 'firebase',
              test: /[\\/]node_modules[\\/](firebase|@firebase)[\\/]/,
              chunks: 'all',
              priority: 30
            },
            // MSAL en chunk separado
            msal: {
              name: 'msal',
              test: /[\\/]node_modules[\\/](@azure\/msal)[\\/]/,
              chunks: 'all',
              priority: 30
            },
            // React y libs comunes
            commons: {
              name: 'commons',
              minChunks: 2,
              priority: 10
            }
          }
        }
      };

      return config;
    }

    // En el servidor, excluir módulos problemáticos
    config.externals = config.externals || [];
    config.externals.push({
      'undici': 'commonjs undici',
      '@firebase/storage': 'commonjs @firebase/storage',
    });

    // Configurar el cache para que funcione mejor con OneDrive
    if (dev) {
      config.cache = false;
    }

    return config;
  },

  // NOTA: Los headers de seguridad se configuran en vercel.json o netlify.toml
  // No funcionan con output: 'export' porque requieren un servidor
};

export default withPWA(nextConfig);

