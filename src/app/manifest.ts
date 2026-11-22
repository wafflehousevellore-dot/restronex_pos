import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'RestroNex — Restaurant POS & Management System',
    short_name: 'RestroNex POS',
    description: 'Enterprise Multi-Tenant Restaurant POS, Mobile Billing, Inventory Management & Kitchen Operations',
    start_url: '/app/pos',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#F8FAF9',
    theme_color: '#16845B',
    categories: ['business', 'finance', 'productivity', 'utilities'],
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
    shortcuts: [
      {
        name: 'POS Billing Terminal',
        short_name: 'POS',
        description: 'Open Mobile POS Terminal for instant billing',
        url: '/app/pos',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Live Kitchen KDS',
        short_name: 'Kitchen',
        description: 'View Kitchen Display Screen',
        url: '/app/kitchen',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Inventory & Stock',
        short_name: 'Inventory',
        description: 'Manage ingredients, stock and bulk sales',
        url: '/app/inventory',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Orders History',
        short_name: 'Orders',
        description: 'Review orders and digital invoices',
        url: '/app/orders',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
    ],
  };
}
