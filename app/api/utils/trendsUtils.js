// === TRENDS UTILS ===
// Håndterer Google Trends og rensing/kombinasjon av data

export async function fetchGoogleTrends(category) {
  try {
    const res = await fetch(
      "https://trends.google.com/trendingsearches/daily/rss?geo=US"
    );
    const xml = await res.text();
    const matches = [...xml.matchAll(/<title>(.*?)<\/title>/g)];
    const allTitles = matches.map((m) => m[1]).slice(1);
    const relevant = allTitles.filter((t) =>
      t.toLowerCase().includes(category.toLowerCase())
    );
    return relevant.length > 0 ? relevant.slice(0, 5) : allTitles.slice(0, 5);
  } catch (err) {
    console.warn(
      `⚠️ Google Trends RSS fetch failed for ${category}:`,
      err.message
    );
    return [];
  }
}

export function cleanTrends(arr) {
  return Array.from(
    new Map(
      arr.map((item) => {
        const title = typeof item === "string" ? item : item.title;
        const subreddit = typeof item === "string" ? null : item.subreddit;
        return [title, { title, subreddit }];
      })
    ).values()
  )
    .map((obj) => ({
      title: obj.title.replace(/&amp;/g, "&").trim(),
      subreddit: obj.subreddit,
    }))
    .filter(
      (obj) =>
        obj.title.length > 3 && !obj.title.match(/reddit|thread|discussion/i)
    )
    .slice(0, 5);
}
