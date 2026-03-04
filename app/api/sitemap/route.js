// app/api/sitemap.xml/route.js
export async function GET() {
  return new Response(null, {
    status: 308,
    headers: {
      Location: "/sitemap.xml",
    },
  });
}
