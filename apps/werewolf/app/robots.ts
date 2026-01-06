import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://werewolf.virtualboardzone.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/room/', '/api/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
