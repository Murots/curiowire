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

      // valgfritt: gammel paginert URL -> ny (så /sitemap-1.xml ikke er “død”)
      {
        source: "/sitemap-:page(\\d+).xml",
        destination: "/sitemaps/:page.xml",
        permanent: true,
      },
    ];
  },

  async rewrites() {
    return [
      // /sitemaps/1.xml -> /__sitemaps/1
      {
        source: "/sitemaps/:page(\\d+).xml",
        destination: "/__sitemaps/:page",
      },
    ];
  },
};

export default nextConfig;
