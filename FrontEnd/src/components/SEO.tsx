import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { sanitizeMediaUrl } from '../utils/security';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
}

const SEO: React.FC<SEOProps> = ({
  title = 'Fronto - Cyber Music Player',
  description = 'Experience music in a futuristic cyberpunk interface with Fronto.',
  keywords = 'music player, cyberpunk, audio, playlist, frontend',
  image = '/PTracklist.png',
  url,
}) => {
  const safeOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const safeUrl = sanitizeMediaUrl(url) || (typeof window !== 'undefined' ? window.location.href : '');
  const safeImage = sanitizeMediaUrl(image) || '/PTracklist.png';
  const siteTitle = title;

  useEffect(() => {
    document.title = siteTitle;
  }, [siteTitle]);

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Fronto",
    "url": safeOrigin,
    "description": description,
    "applicationCategory": "MultimediaApplication",
    "operatingSystem": "Web",
    "image": safeImage,
  }).replace(/</g, '\\u003c');

  return (
    <Helmet>
      <title>{siteTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />

      <meta property="og:type" content="website" />
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={safeImage} />
      {safeUrl && <meta property="og:url" content={safeUrl} />}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={siteTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={safeImage} />

      <script type="application/ld+json">{jsonLd}</script>

      {safeUrl && <link rel="canonical" href={safeUrl} />}
    </Helmet>
  );
};

export default SEO;
