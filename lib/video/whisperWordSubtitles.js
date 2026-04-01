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
// - ✅ Frame-snap timings (CFR 30) + minimum chunk duration (less jitter)
// - ✅ Smart chunking: default 3 words, 2 if long, 4 if short
// - ✅ Glow + text now animate identically and wrap more consistently
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
const MIN_CHUNK_DUR = 0.18;

function snapToFrame(t) {
  return Math.round(t / FRAME) * FRAME;
}

// ============================================================================
// Chunk helpers
// ============================================================================
function normalizeWord(raw) {
  return String(raw || "").trim();
}

function isBlockedWord(raw) {
  return BLOCK_WORDS.includes(normalizeWord(raw).toLowerCase());
}

function cleanedWordLength(raw) {
  return normalizeWord(raw).replace(/[^\p{L}\p{N}]/gu, "").length;
}

function endsSentence(raw) {
  const word = normalizeWord(raw);
  return /[.!?]["')\]]*$/.test(word);
}

function endsStrongPause(raw) {
  const word = normalizeWord(raw);
  return /[:;]["')\]]*$/.test(word);
}

function decideChunkSize(words, startIndex) {
  const sample = words.slice(startIndex, startIndex + 4);

  if (!sample.length) return 3;

  const avgLen =
    sample.reduce((sum, w) => sum + cleanedWordLength(w.word), 0) /
    sample.length;

  if (avgLen >= 7) return 2;
  if (avgLen <= 4) return 4;
  return 3;
}

function estimateWordVisualLength(raw) {
  const word = normalizeWord(raw);

  let score = 0;
  for (const ch of word) {
    if ("ilIjtfr.,'`!:;|".includes(ch)) score += 0.5;
    else if ("mwMWQO@#%&".includes(ch)) score += 1.35;
    else if (ch === " ") score += 0.45;
    else score += 1;
  }

  return score;
}

function estimateChunkVisualLength(words) {
  return words.reduce((sum, w, i) => {
    return sum + estimateWordVisualLength(w.word) + (i > 0 ? 0.55 : 0);
  }, 0);
}

function forceStableLineBreak(chunk) {
  if (!Array.isArray(chunk) || chunk.length <= 1) {
    return chunk
      .map((w) => normalizeWord(w.word))
      .join(" ")
      .trim();
  }

  const words = chunk.map((w) => normalizeWord(w.word)).filter(Boolean);
  if (words.length <= 1) return words.join(" ");

  // Conservative width threshold so text never wraps during pop animation
  const totalScore = estimateChunkVisualLength(words.map((word) => ({ word })));

  // Tuned for Playfair Display size ~100 with outline/glow and 9:16 layout
  const SAFE_SINGLE_LINE_SCORE = 15.5;

  if (totalScore <= SAFE_SINGLE_LINE_SCORE) {
    return words.join(" ");
  }

  // Find best split into 2 stable lines
  let bestSplit = 1;
  let bestBalance = Infinity;

  for (let i = 1; i < words.length; i++) {
    const line1 = words.slice(0, i);
    const line2 = words.slice(i);

    const score1 = estimateChunkVisualLength(line1.map((word) => ({ word })));
    const score2 = estimateChunkVisualLength(line2.map((word) => ({ word })));

    const widest = Math.max(score1, score2);
    const balance = Math.abs(score1 - score2);

    // Prefer splits that reduce widest line first, then balance
    const rank = widest * 10 + balance;

    if (rank < bestBalance) {
      bestBalance = rank;
      bestSplit = i;
    }
  }

  return `${words.slice(0, bestSplit).join(" ")}\\N${words
    .slice(bestSplit)
    .join(" ")}`;
}

function buildChunks(words) {
  const filtered = words.filter((w) => {
    const rawWord = normalizeWord(w.word);
    if (!rawWord) return false;
    if (isBlockedWord(rawWord)) return false;
    return true;
  });

  const chunks = [];

  for (let i = 0; i < filtered.length; ) {
    const targetSize = decideChunkSize(filtered, i);
    const chunk = [];

    for (let j = i; j < filtered.length && chunk.length < targetSize; j++) {
      const current = filtered[j];
      chunk.push(current);

      const raw = normalizeWord(current.word);

      // Hard stop at sentence end
      if (endsSentence(raw)) {
        break;
      }

      // Optional softer stop at strong punctuation,
      // but only if we already have at least 2 words
      if (chunk.length >= 2 && endsStrongPause(raw)) {
        break;
      }
    }

    if (chunk.length) {
      chunks.push(chunk);
      i += chunk.length;
    } else {
      i += 1;
    }
  }

  return chunks;
}

function escapeAssText(text) {
  return String(text || "")
    .replace(/{/g, "\\{")
    .replace(/}/g, "\\}")
    .replace(/,/g, "\\,");
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

  const chunks = buildChunks(words);
  if (!chunks.length) throw new Error("No subtitle chunks could be built.");

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

  // Shared pop animation so glow and text always behave identically
  const popAnim = "\\shad0\\fscx92\\fscy92\\t(0.06,0.16,\\fscx100\\fscy100)";

  // ========================================================================
  // BUILD CHUNK LINES — two layers per chunk
  // ========================================================================
  for (const chunk of chunks) {
    const text = forceStableLineBreak(chunk);
    if (!text) continue;

    let start = typeof chunk[0]?.start === "number" ? chunk[0].start : prevEnd;

    let end =
      typeof chunk[chunk.length - 1]?.end === "number"
        ? chunk[chunk.length - 1].end
        : start + MIN_CHUNK_DUR;

    // keep monotonic
    if (start < prevEnd) start = prevEnd + 0.01;
    if (end <= start) end = start + MIN_CHUNK_DUR;

    // snap to 30fps frame grid (reduces micro-jitter on CFR 30)
    start = snapToFrame(start);
    end = snapToFrame(end);

    // enforce minimum duration after snapping
    if (end - start < MIN_CHUNK_DUR) {
      end = snapToFrame(start + MIN_CHUNK_DUR);
    }

    prevEnd = end;

    const safe = escapeAssText(text);

    // ======================================================================
    // COLOR LOGIC
    // ======================================================================
    const chunkWordsLower = chunk.map((w) =>
      normalizeWord(w.word).toLowerCase(),
    );

    const hasNumber = chunkWordsLower.some((w) => NUMBER_REGEX.test(w));
    const hasHighlight = chunkWordsLower.some((w) =>
      HIGHLIGHT_WORDS.includes(w),
    );

    let color = "\\c&HFFFFFF&";
    let transition = "";

    if (hasNumber) {
      color = "\\c&H00CCFF&";
      transition = "\\t(0,0.25,\\c&H00FFFF&)";
    } else if (hasHighlight) {
      color = "\\c&H22CC22&";
      transition = "\\t(0,0.30,\\c&H22FF88&)";
    }

    // ======================================================================
    // Two-layer glow system
    // ======================================================================

    // === GLOW LAYER (behind text, layer=-1) ===
    // Slightly tighter than before so it wraps more like the real text.
    const glowStyle =
      `{` +
      "\\bord10" +
      "\\blur8" +
      "\\3c&H55FF99&" +
      "\\alpha&H40&" +
      `${color}${transition}` +
      popAnim +
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
    const textStyle =
      `{` +
      "\\bord4\\blur2" +
      "\\3c&H000000&" +
      `${color}${transition}` +
      popAnim +
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

  console.log("💬 PRO two-layer neon chunked captions generated:", assPath);
  return assPath;
}
