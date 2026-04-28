// /* ============================================================================
// app/api/utils/questions/questionPrompt.js
// ============================================================================ */

// export function buildQuestionPrompt({
//   title,
//   category,
//   card_text,
//   summary_normalized,
// }) {
//   const safe = (v) => String(v || "").trim();

//   return `
// You are creating SEO-focused adjacent questions for a published CurioWire article.

// ARTICLE

// Title:
// ${safe(title)}

// Category:
// ${safe(category)}

// Card:
// ${safe(card_text)}

// Summary:
// ${safe(summary_normalized)}

// GOAL
// Generate questions that expand the article into nearby search-intent topics.
// The questions must be relevant to the article, but must NOT simply restate,
// summarize, or re-answer what the article already explains.

// Use adjacent search intent:
// - broader topics
// - related entities
// - locations
// - people
// - animals
// - products
// - technologies
// - causes
// - comparisons
// - practical use
// - history
// - definitions

// RULES

// - Return up to 5 strong questions only
// - Do not force weak questions
// - Do not restate the article title
// - Do not summarize article content
// - Do not rephrase the main claim
// - Do not repeat the fun fact
// - Avoid duplicate intent
// - Each question must stand alone as a real search query
// - Never invent or make up any information
// - If no strong factual questions can be answered reliably, return []

// ANSWERS

// For each question write a factual answer.

// - 80 to 180 words
// - First sentence answers directly
// - Then brief useful context
// - No fluff
// - No markdown
// - No bullet lists
// - If uncertain, say so clearly
// - No source citations in text

// QUESTION FORMAT

// - Plain text
// - Max 95 characters
// - Natural wording
// - Searchable on its own

// SLUG

// - lowercase
// - hyphen-separated
// - ascii only
// - unique

// OUTPUT

// Return ONLY valid JSON.
// Return an array with up to 5 objects:

// [
//   {
//     "position": 1,
//     "question": "...",
//     "slug": "...",
//     "answer": "..."
//   }
// ]
// `.trim();
// }

/* ============================================================================
app/api/utils/questions/questionPrompt.js
============================================================================ */

export function buildQuestionPrompt({
  title,
  category,
  card_text,
  summary_normalized,
  avoidUrls = [],
}) {
  const safe = (v) => String(v || "").trim();

  const blocked =
    Array.isArray(avoidUrls) && avoidUrls.length
      ? `
DO NOT USE THESE URLS (they already failed validation):
${avoidUrls.map((url) => `- ${safe(url)}`).join("\n")}
`
      : "";

  return `
Create SEO-focused adjacent questions for a published CurioWire article.

You have access to web_search.

ARTICLE

Title:
${safe(title)}

Category:
${safe(category)}

Card:
${safe(card_text)}

Summary:
${safe(summary_normalized)}

TASK

Generate up to 5 strong questions related to the article, but one clear step away from it.

Each question must add new useful information around:
- a closely related topic
- a related entity
- a similar case
- a broader concept
- a method, cause, comparison, debate, implication, or context

Use a balanced mix of question types.
Do not overuse one angle.
A good set should feel like a small topic cluster, not five versions of the same question.

At least 3 questions should move beyond the exact article subject into a related concept, comparison, method, similar case, or broader context.
No more than 2 questions may focus directly on the article’s main subject.

DO NOT create questions whose answer is already clearly given in the article.

Reject questions that mainly ask for:
- a date already stated
- a place already stated
- a number already stated
- a definition already stated
- the main discovery already stated
- the article’s main claim
- the article’s main timeline
- the article’s basic summary

Avoid basic recap questions such as:
- Where is ...?
- When was ... discovered?
- How many ...?
- What is ...?
- Who discovered ...?

A good question should be a natural next click away from the article, not a recap of it.

SOURCE RULES

For each question:

1. Use web_search to find one credible public source first.
2. Write the answer from that source.
3. Include the exact source_url used.
4. If no credible source exists, omit the question.

Do not guess, invent, or construct URLs.
Do not use broken pages, vague pages, forums, Reddit, Quora, social media, affiliate pages, spam, mirrors, or login-only pages.
Do not use file/document links (.pdf, .doc, .xls, .ppt, downloads).
Do not use generic homepages unless the homepage itself directly answers the question.
If a URL redirects to a homepage, choose another result.
Do not reuse previously rejected URLs.

${blocked}

Prefer:
- Wikipedia when directly relevant
- encyclopedias / Britannica
- museums
- universities
- .gov / .edu
- official organizations
- reputable science, history, news, or reference publishers
- accessible academic sources

ANSWER RULES

- 60 to 160 words
- First sentence answers directly
- Brief useful context after
- Factual and source-supported
- No markdown
- No bullet lists
- No citations in the answer text
- Do not include URLs in the answer text
- Do not include claims unsupported by source_url
- Do not mostly repeat the CurioWire article

DEDUPLICATION FIELDS

For each question, include:

anchor_entity:
The main entity, person, place, object, species, technology, event, product, or concept.

topic_tag:
The specific angle that separates this question from other questions about the same anchor.

canonical_question:
A plain, direct version of the question with the same meaning.

Rules:
- Same anchor_entity + same topic_tag = duplicate
- Questions may share anchor_entity only if topic_tag is clearly different
- Avoid duplicate or near-duplicate intent within the output

QUESTION FORMAT

- Plain text
- Max 95 characters
- Natural wording
- Searchable on its own
- No clickbait

SLUG

- lowercase
- hyphen-separated
- ascii only
- unique

OUTPUT

Return ONLY valid JSON.
Return an array with up to 5 objects:

[
  {
    "position": 1,
    "question": "...",
    "slug": "...",
    "answer": "...",
    "source_url": "https://...",
    "anchor_entity": "...",
    "topic_tag": "...",
    "canonical_question": "..."
  }
]
`.trim();
}
