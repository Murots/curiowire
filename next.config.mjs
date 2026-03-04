/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ["styled-components"],
  },
  compiler: {
    styledComponents: {
      ssr: true,
      displayName: true,
    },
  },

  async redirects() {
    return [
      {
        source: "/api/sitemap.xml",
        destination: "/sitemap.xml",
        permanent: true,
      },
      { source: "/api/sitemap", destination: "/sitemap.xml", permanent: true },
    ];
  },

  async rewrites() {
    return [
      // Offentlig: /sitemaps/1.xml -> Intern: /sitemaps/1
      {
        source: "/sitemaps/:page(\\d+).xml",
        destination: "/sitemaps/:page",
      },
    ];
  },
};

export default nextConfig;
