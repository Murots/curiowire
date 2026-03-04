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
      {
        source: "/api/sitemap",
        destination: "/sitemap.xml",
        permanent: true,
      },
    ];
  },

  async rewrites() {
    return [
      // behold denne hvis du vil, men den kolliderer med UI:
      // { source: "/sitemap/:page(\\d+).xml", destination: "/__sitemaps/:page" },

      // NY: /sitemap-1.xml -> /__sitemaps/1 (ingen kollisjon)
      {
        source: "/sitemap-:page(\\d+).xml",
        destination: "/__sitemaps/:page",
      },
    ];
  },
};

export default nextConfig;
