// "use client";

// import React, { useEffect, useState } from "react";
// import { useParams, useRouter } from "next/navigation";
// import Link from "next/link";
// import { supabase } from "@/lib/supabaseClient";
// import {
//   Wrapper,
//   CategoryTag,
//   Headline,
//   SubIntro,
//   Title,
//   Image,
//   Excerpt,
//   SourceLink,
//   BackButton,
//   NextLink,
//   Divider,
// } from "./ArticlePage.styles";
// import { cleanText } from "../../app/api/utils/cleanText";

// export default function ArticlePage() {
//   const { id } = useParams();
//   const router = useRouter();
//   const [article, setArticle] = useState(null);
//   const [nextArticle, setNextArticle] = useState(null);

//   useEffect(() => {
//     if (!id) return;

//     const fetchArticleAndNext = async () => {
//       // 1️⃣ Hent artikkelen
//       const { data: current, error } = await supabase
//         .from("articles")
//         .select("*")
//         .eq("id", id)
//         .single();

//       if (error || !current) {
//         console.error("❌ Error fetching article:", error?.message);
//         return;
//       }

//       setArticle(current);

//       // 2️⃣ Logg visning
//       await supabase.from("article_views").insert([{ article_id: id }]);

//       // 3️⃣ Finn neste artikkel i samme kategori
//       const { data: nextData } = await supabase
//         .from("articles")
//         .select("id, title")
//         .eq("category", current.category)
//         .gt("created_at", current.created_at)
//         .order("created_at", { ascending: true })
//         .limit(1);

//       if (nextData && nextData.length > 0) {
//         setNextArticle(nextData[0]);
//       } else {
//         // Hvis ingen nyere finnes, ta første (eldste) i kategorien
//         const { data: first } = await supabase
//           .from("articles")
//           .select("id, title")
//           .eq("category", current.category)
//           .order("created_at", { ascending: true })
//           .limit(1);
//         if (first && first.length > 0) setNextArticle(first[0]);
//       }
//     };

//     fetchArticleAndNext();
//   }, [id]);

//   if (!article) return <Wrapper>Loading curiosity...</Wrapper>;

//   const { category, title, excerpt, image_url, source_url } = article;

//   return (
//     <Wrapper>
//       <Headline>Extra! Extra!</Headline>
//       <SubIntro>{getCategoryIntro(category)}</SubIntro>
//       <Divider />

//       <Title>{cleanText(title)}</Title>

//       {image_url && <Image src={image_url} alt={cleanText(title)} />}

//       {article.image_credit && (
//         <p
//           style={{
//             fontSize: "0.8rem",
//             color: "var(--color-muted)",
//             fontStyle: "italic",
//             marginBottom: "16px",
//           }}
//         >
//           {article.image_credit}
//         </p>
//       )}

//       <Excerpt>
//         {cleanText(excerpt)
//           .split(/\n{2,}/)
//           .map((p, i) => (
//             <p key={i}>{p.trim()}</p>
//           ))}
//       </Excerpt>

//       {category === "products" && source_url && (
//         <SourceLink href={source_url} target="_blank" rel="noopener noreferrer">
//           See featured product →
//         </SourceLink>
//       )}

//       <div style={{ display: "flex", justifyContent: "space-between" }}>
//         <BackButton onClick={() => router.push(`/${category}`)}>
//           ← Back to {category}
//         </BackButton>

//         {nextArticle ? (
//           <NextLink href={`/article/${nextArticle.id}`}>
//             Next curiosity →
//           </NextLink>
//         ) : (
//           <NextLink href={`/${category}`}>Back to category →</NextLink>
//         )}
//       </div>

//       {category?.toLowerCase() === "products" && (
//         <p
//           style={{
//             fontSize: "0.7rem",
//             color: "var(--color-muted)",
//             textAlign: "center",
//             marginTop: "30px",
//             fontStyle: "italic",
//             lineHeight: "1.4",
//           }}
//         >
//           As an Amazon Associate, CurioWire earns from qualifying purchases.
//         </p>
//       )}
//     </Wrapper>
//   );
// }

// /* === Hjelpefunksjon === */
// function getCategoryIntro(category) {
//   const intros = {
//     science: "🧪 Echoes from the lab",
//     technology: "⚙️ Traces from the dawn of innovation",
//     space: "🚀 Whispers from the silent cosmos",
//     nature: "🌿 Stories carved by wind and water",
//     health: "🫀 Secrets of the human vessel",
//     history: "🏺 Recovered from the dusty archives",
//     culture: "🎭 Fragments from the heart of civilization",
//     sports: "🏆 Legends born in the arena",
//     products: "🛍️ Artifacts of human ingenuity",
//     world: "🌍 Records from the halls of power",
//   };
//   return intros[category?.toLowerCase()] || "- Hot off the wire";
// }

"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import {
  Wrapper,
  Headline,
  SubIntro,
  Title,
  Image,
  Excerpt,
  SourceLink,
  BackButton,
  NextLink,
  Divider,
} from "./ArticlePage.styles";
import { cleanText } from "../../app/api/utils/cleanText";

export default function ArticlePage({
  article: initialArticle,
  nextArticle: initialNext,
}) {
  const { id } = useParams();
  const router = useRouter();
  const [article, setArticle] = useState(initialArticle || null);
  const [nextArticle, setNextArticle] = useState(initialNext || null);

  useEffect(() => {
    // Hvis artikkel allerede er sendt fra parent, ikke hent på nytt
    if (initialArticle) return;

    const fetchArticleAndNext = async () => {
      // 1️⃣ Hent artikkel
      const { data: current, error } = await supabase
        .from("articles")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !current) {
        console.error("❌ Error fetching article:", error?.message);
        return;
      }

      setArticle(current);

      // 2️⃣ Logg visning
      await supabase.from("article_views").insert([{ article_id: id }]);

      // 3️⃣ Finn neste artikkel i samme kategori
      const { data: nextData } = await supabase
        .from("articles")
        .select("id, title")
        .eq("category", current.category)
        .gt("created_at", current.created_at)
        .order("created_at", { ascending: true })
        .limit(1);

      if (nextData && nextData.length > 0) {
        setNextArticle(nextData[0]);
      } else {
        // 🔁 Ingen nyere → hent første artikkel i kategorien (sirkulær)
        const { data: first } = await supabase
          .from("articles")
          .select("id, title")
          .eq("category", current.category)
          .order("created_at", { ascending: true })
          .limit(1);
        if (first && first.length > 0) setNextArticle(first[0]);
      }
    };

    fetchArticleAndNext();
  }, [id, initialArticle]);

  if (!article) return <Wrapper>Loading curiosity...</Wrapper>;

  const { category, title, excerpt, image_url, source_url } = article;

  return (
    <Wrapper>
      <Headline>Extra! Extra!</Headline>
      <SubIntro>{getCategoryIntro(category)}</SubIntro>
      <Divider />

      <Title>{cleanText(title)}</Title>

      {image_url && <Image src={image_url} alt={cleanText(title)} />}

      {article.image_credit && (
        <p
          style={{
            fontSize: "0.8rem",
            color: "var(--color-muted)",
            fontStyle: "italic",
            marginBottom: "16px",
          }}
        >
          {article.image_credit}
        </p>
      )}

      <Excerpt>
        {cleanText(excerpt)
          .split(/\n{2,}/)
          .map((p, i) => (
            <p key={i}>{p.trim()}</p>
          ))}
      </Excerpt>

      {/* 🛍️ Produktlenke */}
      {category === "products" && source_url && (
        <SourceLink href={source_url} target="_blank" rel="noopener noreferrer">
          See featured product →
        </SourceLink>
      )}

      {/* 🔁 Navigasjon nederst */}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <BackButton onClick={() => router.push(`/${category}`)}>
          ← Back to {category}
        </BackButton>

        {nextArticle ? (
          <NextLink href={`/article/${nextArticle.id}`}>
            Next curiosity →
          </NextLink>
        ) : (
          <NextLink href={`/${category}`}>Back to category →</NextLink>
        )}
      </div>

      {/* Amazon disclaimer */}
      {category?.toLowerCase() === "products" && (
        <p
          style={{
            fontSize: "0.7rem",
            color: "var(--color-muted)",
            textAlign: "center",
            marginTop: "30px",
            fontStyle: "italic",
            lineHeight: "1.4",
          }}
        >
          As an Amazon Associate, CurioWire earns from qualifying purchases.
        </p>
      )}
    </Wrapper>
  );
}

/* === Hjelpefunksjon === */
function getCategoryIntro(category) {
  const intros = {
    science: "🧪 Echoes from the lab",
    technology: "⚙️ Traces from the dawn of innovation",
    space: "🚀 Whispers from the silent cosmos",
    nature: "🌿 Stories carved by wind and water",
    health: "🫀 Secrets of the human vessel",
    history: "🏺 Recovered from the dusty archives",
    culture: "🎭 Fragments from the heart of civilization",
    sports: "🏆 Legends born in the arena",
    products: "🛍️ Artifacts of human ingenuity",
    world: "🌍 Records from the halls of power",
  };
  return intros[category?.toLowerCase()] || "- Hot off the wire";
}
