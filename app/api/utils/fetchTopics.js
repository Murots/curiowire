// === TREND FETCHER (identisk logikk) ===
export async function fetchTrendingTopics() {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");

    const res = await fetch(`${baseUrl}/api/trends`);
    const data = await res.json();
    return data.results || {};
  } catch (err) {
    console.error("⚠️ Failed to fetch trending topics:", err.message);
    return {};
  }
}
