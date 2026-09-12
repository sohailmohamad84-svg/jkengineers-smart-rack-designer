import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/customer/'],
      },
    ],
    sitemap: 'https://jkengineersworks.in/sitemap.xml',
  };
}
