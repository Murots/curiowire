/**
 * 🧹 cleanText.js
 * CurioWire tekst-rensefunksjon
 *
 * Fjerner markdown, HTML, spesialtegn og konverterer Reddit-subreddits
 * (f.eks. "/r/sports") til naturlige redaksjonelle uttrykk.
 *
 * Brukes i både ArticleCard.jsx, ArticlePage.jsx og generate/route.js
 */

export function cleanText(text) {
  if (!text) return "";

  return (
    text
      // === Markdown og HTML ===
      .replace(/\*\*/g, "") // fjerner bold (**)
      .replace(/\*/g, "") // fjerner italic (*)
      .replace(/_/g, "") // fjerner underscore-format
      .replace(/<[^>]*>/g, "") // fjerner HTML-tags (f.eks. <p>, <br>)

      // === Reddit-subnavn ===
      .replace(/\/r\/(\w+)/gi, (_, sub) => {
        const dictionary = {
          sports: "the digital sports community",
          space: "the digital space community",
          technology: "the digital technology community",
          science: "the online science collective",
          world: "the digital world forum",
          culture: "the online culture collective",
          health: "the digital health community",
          history: "the online history forum",
          products: "the digital marketplace community",
          nature: "the online nature collective",
        };

        // Hvis vi kjenner subreddit-navnet → bruk tilpasset uttrykk
        if (dictionary[sub.toLowerCase()]) {
          return dictionary[sub.toLowerCase()];
        }

        // Hvis ikke → bruk generisk uttrykk
        return `the digital ${sub.toLowerCase()} community`;
      })

      // === Markdown-lenker [tekst](url) ===
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")

      // === Spesialtegn ===
      .replace(/[•«»©]/g, "")
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/[—–]/g, "-")

      // === Ekstra whitespace og trimming ===
      .replace(/\s+/g, " ")
      .trim()
  );
}
