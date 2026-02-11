// // ============================================================================
// // whisperWordSubtitles.js — PRO TikTok subtitles (FFmpeg 2018 compatible)
// // TWO-LAYER SUBS:
// // - Layer -1: soft neon glow (blurred, enlarged)
// // - Layer  0: main text (outline, crisp)
// // ----------------------------------------------------------------------------
// // Features:
// // - Strong outline for readability
// // - Soft radial glow (FFmpeg 2018–safe via dual lines)
// // - Dynamic highlight colors
// // - Number highlighting
// // - Whisper tail cleanup
// // - Kinetic pop-in scaling
// // ============================================================================

// import fs from "fs-extra";
// import path from "path";
// import OpenAI from "openai";
// import { v4 as uuidv4 } from "uuid";
// import { OUTPUT_DIR, formatAssTime } from "./ffmpegTools.js";

// function getOpenAI() {
//   if (!process.env.OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");
//   return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
// }

// // ============================================================================
// // Stop garbage words Whisper sometimes adds at the end
// // ============================================================================
// const BLOCK_WORDS = [
//   "eso",
//   "transcribed",
//   "subtitle",
//   "caption",
//   "credits",
//   "transcript",
//   "thanks",
//   "you",
//   "note",
//   "music",
//   "bye",
// ];

// // ============================================================================
// // Highlight words (big list)
// // ============================================================================
// const HIGHLIGHT_WORDS = [
//   "incredible",
//   "astonishing",
//   "remarkable",
//   "secret",
//   "deep",
//   "hidden",
//   "ancient",
//   "lost",
//   "dark",
//   "massive",
//   "deadly",
//   "migration",
//   "ocean",
//   "galaxy",
//   "journey",
//   "unbelievable",
//   "mysterious",
//   "mystery",
//   "forbidden",
//   "strange",
//   "unknown",
//   "spectacular",
//   "shocking",
//   "unseen",
//   "fearless",
//   "terrifying",
//   "haunting",
//   "epic",
//   "legendary",
//   "mythical",
//   "forgotten",
//   "vanished",
//   "fatal",
//   "critical",
//   "cosmic",
//   "stellar",
//   "quantum",
//   "particle",
//   "radiation",
//   "gravity",
//   "orbit",
//   "collision",
//   "supernova",
//   "nebula",
//   "voltage",
//   "energy",
//   "magnetic",
//   "plasma",
//   "frequency",
//   "dimension",
//   "astronomy",
//   "biology",
//   "physics",
//   "fractal",
//   "mutation",
//   "evolution",
//   "chemical",
//   "molecule",
//   "cellular",
//   "radioactive",
//   "volcanic",
//   "tectonic",
//   "asteroid",
//   "comet",
//   "meteor",
//   "galactic",
//   "predator",
//   "venom",
//   "poisonous",
//   "thunder",
//   "storm",
//   "hurricane",
//   "earthquake",
//   "tsunami",
//   "eruption",
//   "wild",
//   "ferocious",
//   "apex",
//   "instinct",
//   "swarm",
//   "colony",
//   "hive",
//   "endangered",
//   "extinct",
//   "survival",
//   "forest",
//   "jungle",
//   "desert",
//   "canyon",
//   "mountain",
//   "reef",
//   "coral",
//   "tundra",
//   "arctic",
//   "tropical",
//   "artifact",
//   "civilization",
//   "empire",
//   "kingdom",
//   "ruins",
//   "dynasty",
//   "warrior",
//   "conqueror",
//   "ritual",
//   "sacrifice",
//   "temple",
//   "pyramid",
//   "tomb",
//   "fossil",
//   "excavation",
//   "ancestors",
//   "tribe",
//   "legend",
//   "scroll",
//   "chronicle",
//   "inscription",
//   "hieroglyph",
//   "myth",
//   "oracle",
//   "prophecy",
//   "power",
//   "chaos",
//   "balance",
//   "danger",
//   "hope",
//   "fear",
//   "fate",
//   "destiny",
//   "origin",
//   "rebirth",
//   "collapse",
//   "awakening",
//   "revolution",
//   "crisis",
//   "breakthrough",
//   "discovery",
//   "transformation",
//   "innovation",
//   "mystic",
//   "voyage",
//   "path",
//   "trail",
//   "expedition",
//   "escape",
//   "flight",
//   "rise",
//   "fall",
//   "crossing",
//   "threshold",
//   "frontier",
//   "horizon",
//   "abyss",
//   "realm",
// ];

// const NUMBER_REGEX = /^[0-9]+([.,][0-9]+)?$/;

// // ============================================================================
// // MAIN
// // ============================================================================
// export async function buildWhisperWordSubtitlesFromAudio(audioPath) {
//   console.log("📝 Transcribing with whisper-1…");

//   const openai = getOpenAI();
//   const response = await openai.audio.transcriptions.create({
//     file: fs.createReadStream(audioPath),
//     model: "whisper-1",
//     response_format: "verbose_json",
//     timestamp_granularities: ["word"],
//   });

//   const words = response.words || [];
//   if (!words.length) throw new Error("No word timestamps found.");

//   const id = uuidv4();
//   const assPath = path.join(OUTPUT_DIR, `${id}.ass`);

//   // ==========================================================================
//   // HEADER (one style is enough because overrides happen inline)
//   // ==========================================================================
//   const header = [
//     "[Script Info]",
//     "ScriptType: v4.00+",
//     "PlayResX: 1080",
//     "PlayResY: 1920",
//     "ScaledBorderAndShadow: yes",
//     "",
//     "[V4+ Styles]",
//     "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour," +
//       "Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline," +
//       "Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
//     "Style: Kinetic,Playfair Display,100,&H00FFFFFF,&H00000000,&H00000000,&H64000000," +
//       "-1,0,0,0,100,100,0,0,1,0,0,5,80,80,240,1",
//     "",
//     "[Events]",
//     "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
//   ];

//   const lines = [];
//   let prevEnd = 0;

//   // ==========================================================================
//   // BUILD WORD LINES — two layers per word
//   // ==========================================================================
//   for (const w of words) {
//     if (BLOCK_WORDS.includes(w.word?.toLowerCase())) continue;

//     let start = typeof w.start === "number" ? w.start : prevEnd;
//     let end = typeof w.end === "number" ? w.end : start + 0.12;

//     if (start < prevEnd) start = prevEnd + 0.01;
//     if (end <= start) end = start + 0.12;
//     prevEnd = end;

//     const raw = (w.word || "").trim();
//     if (!raw) continue;

//     const safe = raw
//       .replace(/{/g, "\\{")
//       .replace(/}/g, "\\}")
//       .replace(/,/g, "\\,");

//     // ------------------------------------------------------------
//     // COLOR LOGIC
//     // ------------------------------------------------------------
//     let color = "\\c&HFFFFFF&";
//     let transition = "";

//     if (NUMBER_REGEX.test(raw)) {
//       color = "\\c&H00CCFF&";
//       transition = "\\t(0,0.25,\\c&H00FFFF&)";
//     } else if (HIGHLIGHT_WORDS.includes(raw.toLowerCase())) {
//       color = "\\c&H22CC22&";
//       transition = "\\t(0,0.30,\\c&H22FF88&)";
//     }

//     // ------------------------------------------------------------
//     // Two-layer glow system
//     // ------------------------------------------------------------

//     // === GLOW LAYER (behind text, layer=-1) ===
//     // Slightly larger, blurred, neon-ish outline color
//     const glowStyle =
//       `{` +
//       //   "\\fscx100\\fscy100" + // larger behind
//       "\\bord13" + // thick outline
//       "\\blur10" + // soft glow
//       "\\3c&H55FF99&" + // glow color
//       "\\alpha&H40&" + // slight transparency
//       `${color}${transition}` + // same color logic
//       "}" +
//       safe;

//     lines.push(
//       [
//         "Dialogue: -1",
//         formatAssTime(start),
//         formatAssTime(end),
//         "Kinetic",
//         "",
//         "0",
//         "0",
//         "240",
//         "",
//         glowStyle,
//       ].join(",")
//     );

//     // === TEXT LAYER (foreground, sharp) ===
//     const textStyle =
//       `{` +
//       "\\bord4\\blur2" + // crisp outline + slight feather
//       "\\3c&H000000&" + // black outline
//       `${color}${transition}` +
//       "\\fscx100\\fscy100" +
//       "\\shad0" + // no directional shadow
//       "\\fscx85\\fscy85\\t(0.10,0.20,\\fscx100\\fscy100)" + // pop-in
//       "}" +
//       safe;

//     lines.push(
//       [
//         "Dialogue: 0",
//         formatAssTime(start),
//         formatAssTime(end),
//         "Kinetic",
//         "",
//         "0",
//         "0",
//         "240",
//         "",
//         textStyle,
//       ].join(",")
//     );
//   }

//   // ==========================================================================
//   // WRITE FILE
//   // ==========================================================================
//   const output = header.concat(lines).join("\n");
//   await fs.writeFile(assPath, output, "utf8");

//   console.log("💬 PRO two-layer neon captions generated:", assPath);
//   return assPath;
// }

// lib/video/whisperWordSubtitles.js — PRO TikTok subtitles (FFmpeg 2018 compatible)
// TWO-LAYER SUBS:
// - Layer -1: soft neon glow (blurred, enlarged)
// - Layer  0: main text (outline, crisp)
// ----------------------------------------------------------------------------
// Features:
// - Strong outline for readability
// - Soft radial glow (FFmpeg 2018–safe via dual lines)
// - Dynamic highlight colors
// - Number highlighting
// - Whisper tail cleanup
// - Kinetic pop-in scaling
// - ✅ Frame-snap timings (CFR 30) + minimum word duration (less jitter)
// ============================================================================

import fs from "fs-extra";
import path from "path";
import OpenAI from "openai";
import { v4 as uuidv4 } from "uuid";
import { OUTPUT_DIR, formatAssTime } from "./ffmpegTools.js";

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// ============================================================================
// Stop garbage words Whisper sometimes adds at the end
// ============================================================================
const BLOCK_WORDS = [
  "eso",
  "transcribed",
  "subtitle",
  "caption",
  "credits",
  "transcript",
  "thanks",
  "you",
  "note",
  "music",
  "bye",
];

// ============================================================================
// Highlight words (big list)
// ============================================================================
const HIGHLIGHT_WORDS = [
  "incredible",
  "astonishing",
  "remarkable",
  "secret",
  "deep",
  "hidden",
  "ancient",
  "lost",
  "dark",
  "massive",
  "deadly",
  "migration",
  "ocean",
  "galaxy",
  "journey",
  "unbelievable",
  "mysterious",
  "mystery",
  "forbidden",
  "strange",
  "unknown",
  "spectacular",
  "shocking",
  "unseen",
  "fearless",
  "terrifying",
  "haunting",
  "epic",
  "legendary",
  "mythical",
  "forgotten",
  "vanished",
  "fatal",
  "critical",
  "cosmic",
  "stellar",
  "quantum",
  "particle",
  "radiation",
  "gravity",
  "orbit",
  "collision",
  "supernova",
  "nebula",
  "voltage",
  "energy",
  "magnetic",
  "plasma",
  "frequency",
  "dimension",
  "astronomy",
  "biology",
  "physics",
  "fractal",
  "mutation",
  "evolution",
  "chemical",
  "molecule",
  "cellular",
  "radioactive",
  "volcanic",
  "tectonic",
  "asteroid",
  "comet",
  "meteor",
  "galactic",
  "predator",
  "venom",
  "poisonous",
  "thunder",
  "storm",
  "hurricane",
  "earthquake",
  "tsunami",
  "eruption",
  "wild",
  "ferocious",
  "apex",
  "instinct",
  "swarm",
  "colony",
  "hive",
  "endangered",
  "extinct",
  "survival",
  "forest",
  "jungle",
  "desert",
  "canyon",
  "mountain",
  "reef",
  "coral",
  "tundra",
  "arctic",
  "tropical",
  "artifact",
  "civilization",
  "empire",
  "kingdom",
  "ruins",
  "dynasty",
  "warrior",
  "conqueror",
  "ritual",
  "sacrifice",
  "temple",
  "pyramid",
  "tomb",
  "fossil",
  "excavation",
  "ancestors",
  "tribe",
  "legend",
  "scroll",
  "chronicle",
  "inscription",
  "hieroglyph",
  "myth",
  "oracle",
  "prophecy",
  "power",
  "chaos",
  "balance",
  "danger",
  "hope",
  "fear",
  "fate",
  "destiny",
  "origin",
  "rebirth",
  "collapse",
  "awakening",
  "revolution",
  "crisis",
  "breakthrough",
  "discovery",
  "transformation",
  "innovation",
  "mystic",
  "voyage",
  "path",
  "trail",
  "expedition",
  "escape",
  "flight",
  "rise",
  "fall",
  "crossing",
  "threshold",
  "frontier",
  "horizon",
  "abyss",
  "realm",
];

const NUMBER_REGEX = /^[0-9]+([.,][0-9]+)?$/;

// ============================================================================
// Timing smoothing (CFR 30)
// ============================================================================
const FPS = 30;
const FRAME = 1 / FPS;
const MIN_WORD_DUR = 0.14;

function snapToFrame(t) {
  return Math.round(t / FRAME) * FRAME;
}

// ============================================================================
// MAIN
// ============================================================================
export async function buildWhisperWordSubtitlesFromAudio(audioPath) {
  console.log("📝 Transcribing with whisper-1…");

  const openai = getOpenAI();
  const response = await openai.audio.transcriptions.create({
    file: fs.createReadStream(audioPath),
    model: "whisper-1",
    response_format: "verbose_json",
    timestamp_granularities: ["word"],
  });

  const words = response.words || [];
  if (!words.length) throw new Error("No word timestamps found.");

  const id = uuidv4();
  const assPath = path.join(OUTPUT_DIR, `${id}.ass`);

  // ========================================================================
  // HEADER (one style is enough because overrides happen inline)
  // ========================================================================
  const header = [
    "[Script Info]",
    "ScriptType: v4.00+",
    "PlayResX: 1080",
    "PlayResY: 1920",
    "ScaledBorderAndShadow: yes",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour," +
      "Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline," +
      "Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    "Style: Kinetic,Playfair Display,100,&H00FFFFFF,&H00000000,&H00000000,&H64000000," +
      "-1,0,0,0,100,100,0,0,1,0,0,5,80,80,240,1",
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ];

  const lines = [];
  let prevEnd = 0;

  // ========================================================================
  // BUILD WORD LINES — two layers per word
  // ========================================================================
  for (const w of words) {
    const rawWord = (w.word || "").trim();
    if (!rawWord) continue;

    if (BLOCK_WORDS.includes(rawWord.toLowerCase())) continue;

    let start = typeof w.start === "number" ? w.start : prevEnd;
    let end = typeof w.end === "number" ? w.end : start + MIN_WORD_DUR;

    // keep monotonic
    if (start < prevEnd) start = prevEnd + 0.01;
    if (end <= start) end = start + MIN_WORD_DUR;

    // snap to 30fps frame grid (reduces micro-jitter on CFR 30)
    start = snapToFrame(start);
    end = snapToFrame(end);

    // enforce minimum duration after snapping
    if (end - start < MIN_WORD_DUR) {
      end = snapToFrame(start + MIN_WORD_DUR);
    }

    prevEnd = end;

    const safe = rawWord
      .replace(/{/g, "\\{")
      .replace(/}/g, "\\}")
      .replace(/,/g, "\\,");

    // ======================================================================
    // COLOR LOGIC
    // ======================================================================
    let color = "\\c&HFFFFFF&";
    let transition = "";

    if (NUMBER_REGEX.test(rawWord)) {
      color = "\\c&H00CCFF&";
      transition = "\\t(0,0.25,\\c&H00FFFF&)";
    } else if (HIGHLIGHT_WORDS.includes(rawWord.toLowerCase())) {
      color = "\\c&H22CC22&";
      transition = "\\t(0,0.30,\\c&H22FF88&)";
    }

    // ======================================================================
    // Two-layer glow system
    // ======================================================================

    // === GLOW LAYER (behind text, layer=-1) ===
    const glowStyle =
      `{` +
      "\\bord13" +
      "\\blur10" +
      "\\3c&H55FF99&" +
      "\\alpha&H40&" +
      `${color}${transition}` +
      `}` +
      safe;

    lines.push(
      [
        "Dialogue: -1",
        formatAssTime(start),
        formatAssTime(end),
        "Kinetic",
        "",
        "0",
        "0",
        "240",
        "",
        glowStyle,
      ].join(","),
    );

    // === TEXT LAYER (foreground, sharp) ===
    // Keep pop-in, but now timings are frame-snapped and not micro-short.
    const textStyle =
      `{` +
      "\\bord4\\blur2" +
      "\\3c&H000000&" +
      `${color}${transition}` +
      "\\shad0" +
      "\\fscx85\\fscy85\\t(0.08,0.18,\\fscx100\\fscy100)" +
      `}` +
      safe;

    lines.push(
      [
        "Dialogue: 0",
        formatAssTime(start),
        formatAssTime(end),
        "Kinetic",
        "",
        "0",
        "0",
        "240",
        "",
        textStyle,
      ].join(","),
    );
  }

  // ========================================================================
  // WRITE FILE
  // ========================================================================
  const output = header.concat(lines).join("\n");
  await fs.writeFile(assPath, output, "utf8");

  console.log("💬 PRO two-layer neon captions generated:", assPath);
  return assPath;
}
