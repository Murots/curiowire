// app/api/sitemap/route.js

export async function GET() {
  return new Response(null, {
    status: 308,
    headers: {
      Location: "https://curiowire.com/sitemap.xml",
    },
  });
}
