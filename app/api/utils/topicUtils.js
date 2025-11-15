// // === TOPIC UTILS ===
// // Inneholder all logikk for valg, re-pick og GPT fallback av topics
// import OpenAI from "openai";

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
//   organization: process.env.OPENAI_ORG_ID,
// });

// /**
//  * Henter ny topic dersom den forrige var duplikat eller lignende
//  */
// export async function pickNewTopic(
//   key,
//   topicsByCategory,
//   primarySource,
//   fallbackSource,
//   triedTopics = []
// ) {
//   const topicData = topicsByCategory[key];
//   const primaryList = topicData?.[primarySource] || [];
//   const fallbackList = topicData?.[fallbackSource] || [];

//   // 1️⃣ Filtrer ut allerede brukte topics
//   const remaining = primaryList.filter((t) => !triedTopics.includes(t));

//   // 2️⃣ Velg ny topic hvis mulig
//   if (remaining.length > 0) {
//     const pick = remaining[Math.floor(Math.random() * remaining.length)];
//     return typeof pick === "object" && pick?.title ? pick.title : pick;
//   }

//   // 3️⃣ Prøv fallback-kilden
//   const fallbackRemaining = fallbackList.filter(
//     (t) => !triedTopics.includes(t)
//   );
//   if (fallbackRemaining.length > 0) {
//     console.log(`🌐 Using ${fallbackSource} fallback for ${key}`);
//     const pick =
//       fallbackRemaining[Math.floor(Math.random() * fallbackRemaining.length)];
//     return typeof pick === "object" && pick?.title ? pick.title : pick;
//   }

//   // 4️⃣ Siste utvei → GPT fallback-topic
//   console.log(`🧠 GPT fallback-topic used for ${key}`);
//   const completion = await openai.chat.completions.create({
//     model: "gpt-4o-mini",
//     messages: [
//       {
//         role: "user",
//         content: `Suggest one factual, relevant, and current topic related to the category "${key}". Avoid fiction, politics, or speculation. Return a short topic title (max 8 words).`,
//       },
//     ],
//     max_tokens: 30,
//     temperature: 0.5,
//   });
//   return (
//     completion.choices[0]?.message?.content?.trim() ||
//     `notable ${key} curiosity`
//   );
// }

// /**
//  * GPT fallback når Reddit og Google feiler
//  */
// export async function generateFallbackTopic(category) {
//   try {
//     const c = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [
//         {
//           role: "user",
//           content: `Suggest one factual, current topic related to ${category}. Avoid fiction or speculation.`,
//         },
//       ],
//       max_tokens: 40,
//       temperature: 0.5,
//     });
//     return c.choices[0]?.message?.content?.trim();
//   } catch {
//     return null;
//   }
// }
