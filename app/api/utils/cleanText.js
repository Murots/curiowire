/**
 * 🧹 cleanText.js
 * CurioWire tekst-rensefunksjon
 *
 * Fjerner markdown, HTML, spesialtegn og konverterer Reddit-subreddits
 * til naturlige redaksjonelle uttrykk — men bevarer linjeskift.
 */

export function cleanText(text) {
  if (!text) return "";

  return (
    text
      // === Markdown og HTML ===
      .replace(/\*\*/g, "") // fjerner bold (**)
      .replace(/\*/g, "") // fjerner italic (*)
      .replace(/_/g, "") // fjerner underscore-format
      .replace(/<[^>]*>/g, "") // fjerner HTML-tags

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
        return (
          dictionary[sub.toLowerCase()] ||
          `the digital ${sub.toLowerCase()} community`
        );
      })

      // === Markdown-lenker [tekst](url) ===
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")

      // === Spesialtegn ===
      .replace(/[•«»©]/g, "")
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/[—–]/g, "-")

      // === Ekstra mellomrom men behold linjeskift ===
      .replace(/[ \t]+/g, " ") // fjerner doble mellomrom og tab, men lar \n stå

      // === Fjern overflødige linjeskift (men behold avsnitt) ===
      .replace(/\n{3,}/g, "\n\n")

      .trim()
  );
}
