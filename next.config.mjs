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
      // Offentlig URL: /sitemap/1.xml -> intern: /__sitemaps/1
      {
        source: "/sitemap/:page(\\d+).xml",
        destination: "/__sitemaps/:page",
      },
    ];
  },
};

export default nextConfig;
