// export const theme = {
//   colors: {
//     // 🎨 Grunnfarger
//     bg: "#f9f9fb",
//     text: "#222",
//     link: "#222",
//     card: "#fff",
//     border: "#ddd",

//     // ✨ Nye nøkkelfarger
//     accent: "#95010eff", // brukt til understreker, hover osv.
//     muted: "#7c7c7cff", // brukt til datoer, meta-tekst, rammer
//     bgAlt: "#eaeaeaff", // brukt i header/footer
//     special: "#c93",
//   },

//   fonts: {
//     heading: "'Playfair Display', sans-serif",
//     body: "'Inter', sans-serif",
//   },
//   shadow: "0 4px 10px rgba(0,0,0,0.08)",
// };

export const theme = {
  colors: {
    bg: "#f9f9fb",
    text: "#222",
    link: "#222",
    card: "#fff",
    border: "#ddd",
    accent: "#95010eff",
    muted: "#7c7c7cff",
    bgAlt: "#eaeaeaff",
    special: "#c93",
  },

  fonts: {
    // ✅ bruk Next/font CSS variables
    heading: "var(--font-playfair)",
    body: "var(--font-inter)",
  },

  shadow: "0 4px 10px rgba(0,0,0,0.08)",
};
