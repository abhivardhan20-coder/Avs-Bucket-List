import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    server: {
      port: 3000,
      strictPort: true,
      host: '0.0.0.0',
      watch: {
        ignored: ['**/.pwa-profile/**', '**/.git/**', '**/venv/**'],
      },
      // Note: FastAPI proxy removed in favor of Supabase
      // If you still need a backend for TMDB key hiding, configure it separately
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: true
        },
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'pwa-icon.svg', 'pwa-icon.png'],
        manifest: {
          name: 'AV’s Bucket List',
          short_name: 'BucketList',
          description: 'Track your movies and series with Supabase sync',
          theme_color: '#141414',
          background_color: '#141414',
          display: 'standalone',
          icons: [
            {
              src: 'pwa-icon.png',
              sizes: '192x192 512x512',
              type: 'image/png'
            },
            {
              src: 'pwa-icon.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/image\.tmdb\.org\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'tmdb-images',
                expiration: {
                  maxEntries: 200,
                  maxAgeSeconds: 60 * 60 * 24 * 30 // 30 Days
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 Year
                }
              }
            },
            {
              urlPattern: /^https:\/\/(cdn\.myanimelist\.net|s4\.anilist\.co|m\.media-amazon\.com)\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'anime-omdb-images',
                expiration: {
                  maxEntries: 200,
                  maxAgeSeconds: 60 * 60 * 24 * 30 // 30 Days
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        }
      })
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-icons': ['lucide-react'],
            'vendor-db': ['dexie', 'dexie-react-hooks'],
            'vendor-query': ['@tanstack/react-query'],
            'vendor-ui': ['react-window', '@react-oauth/google', 'react-error-boundary'],
            'vendor-utils': ['clsx', 'tailwind-merge', 'jwt-decode', '@supabase/supabase-js']
          }
        }
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      }
    },
    test: {
      globals: true,
      environment: 'jsdom',
    }
  };
});