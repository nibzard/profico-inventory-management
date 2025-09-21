const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  fallbacks: {
    document: '/offline',
  },
  sw: 'sw.js',
  customWorkerDir: 'worker',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 365 days
        },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-stylesheets',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 365 days
        },
      },
    },
    {
      urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-font-assets',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        },
      },
    },
    {
      urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-image-assets',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    {
      urlPattern: /\/_next\/static\/.+\/js\/.*/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-js-assets',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    {
      urlPattern: /\/_next\/static\/.+\/css\/.*/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-css-assets',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    // Equipment data API - Cache first for offline availability
    {
      urlPattern: /\/api\/equipment$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'equipment-list',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 60 * 60, // 1 hour
        },
        networkTimeoutSeconds: 10,
        cacheKeyWillBeUsed: async ({ request }) => {
          return `${request.url}-${Date.now() - (Date.now() % (60 * 60 * 1000))}`;
        },
      },
    },
    // Individual equipment details - Cache for offline viewing
    {
      urlPattern: /\/api\/equipment\/[^\/]+$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'equipment-details',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 30 * 60, // 30 minutes
        },
        networkTimeoutSeconds: 10,
      },
    },
    // User data for offline functionality
    {
      urlPattern: /\/api\/users$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'user-data',
        expiration: {
          maxEntries: 5,
          maxAgeSeconds: 60 * 60, // 1 hour
        },
        networkTimeoutSeconds: 10,
      },
    },
    // Generic API calls - Network first with offline fallback
    {
      urlPattern: /\/api\/.*$/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-calls',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 10 * 60, // 10 minutes
        },
        networkTimeoutSeconds: 15,
      },
    },
    // HTML pages - Network first with offline fallback
    {
      urlPattern: /.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'html-cache',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
        networkTimeoutSeconds: 15,
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
};

module.exports = withPWA(nextConfig);