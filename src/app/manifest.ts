import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'RestroNex — Restaurant POS & Management System',
    short_name: 'RestroNex',
    description: 'Next-generation cloud POS, KDS, QR ordering, and restaurant management platform.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0F1E19',
    theme_color: '#16845B',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
