// "use client";

// import React, { useEffect, useState } from "react";
// import { useParams, useRouter } from "next/navigation";
// import { supabase } from "@/lib/supabaseClient";
// import {
//   Wrapper,
//   Headline,
//   SubIntro,
//   Title,
//   Image,
//   Excerpt,
//   SourceLink,
//   BackButton,
//   NextLink,
//   Divider,
//   Published,
// } from "./ArticlePage.styles";
// import { cleanText } from "../../app/api/utils/cleanText";
// import { CategoryBadge } from "./ArticlePage.styles";

// export default function ArticlePage({
//   article: initialArticle,
//   nextArticle: initialNext,
// }) {
//   const params = useParams();
//   const id = params?.id;
//   const router = useRouter();
//   const [article, setArticle] = useState(initialArticle || null);
//   const [nextArticle, setNextArticle] = useState(initialNext || null);

//   useEffect(() => {
//     if (!id) return;

//     const fetchArticleAndNext = async () => {
//       try {
//         let current = initialArticle;

//         // 🔹 Hent artikkel dersom ikke sendt som prop
//         if (!current) {
//           const { data, error } = await supabase
//             .from("articles")
//             .select("*")
//             .eq("id", id)
//             .single();

//           if (error || !data) {
//             console.error("❌ Could not fetch article:", error?.message);
//             return;
//           }

//           current = data;
//           setArticle(data);
//         }

//         // 🔹 Logg visning (kun i browser)
//         if (typeof window !== "undefined") {
//           try {
//             const res = await fetch("/api/logView", {
//               method: "POST",
//               headers: { "Content-Type": "application/json" },
//               body: JSON.stringify({ articleId: Number(id) }),
//             });

//             if (!res.ok) {
//               const json = await res.json();
//               console.warn("⚠️ logView failed:", res.status, json);
//             }
//           } catch (err) {
//             console.error("⚠️ logView request error:", err);
//           }
//         }

//         // 🔹 Finn neste artikkel i samme kategori
//         const { data: nextData } = await supabase
//           .from("articles")
//           .select("id, title")
//           .eq("category", current.category)
//           .gt("created_at", current.created_at)
//           .order("created_at", { ascending: true })
//           .limit(1);

//         if (nextData?.length) {
//           setNextArticle(nextData[0]);
//         } else {
//           // fallback: første artikkel i kategorien
//           const { data: first } = await supabase
//             .from("articles")
//             .select("id, title")
//             .eq("category", current.category)
//             .order("created_at", { ascending: true })
//             .limit(1);

//           if (first?.length) setNextArticle(first[0]);
//         }
//       } catch (err) {
//         console.error("⚠️ fetchArticleAndNext error:", err);
//       }
//     };

//     fetchArticleAndNext();
//   }, [id, initialArticle]);

//   if (!article) return <Wrapper>Loading curiosity...</Wrapper>;

//   const {
//     category,
//     title,
//     excerpt,
//     image_url,
//     created_at,
//     source_url,
//     seo_title,
//     seo_description,
//     seo_keywords,
//     hashtags,
//   } = article;

//   const formattedDate = new Date(created_at).toLocaleDateString("en-GB", {
//     day: "2-digit",
//     month: "short",
//     year: "numeric",
//     timeZone: "UTC",
//   });

//   return (
//     <Wrapper>
//       <Headline>Extra! Extra!</Headline>
//       <SubIntro>{getCategoryIntro(category)}</SubIntro>
//       <Divider />

//       <Title>{cleanText(title)}</Title>
//       <Published>
//         <CategoryBadge $category={category}>{category}</CategoryBadge>
//         Published {formattedDate}
//       </Published>

//       {image_url && (
//         <Image
//           src={`${image_url}?width=1200&quality=80&format=webp`}
//           srcSet={`
//             ${image_url}?width=400&quality=70&format=webp 400w,
//             ${image_url}?width=800&quality=75&format=webp 800w,
//             ${image_url}?width=1200&quality=80&format=webp 1200w,
//             ${image_url}?width=1600&quality=85&format=webp 1600w
//           `}
//           sizes="(max-width: 600px) 400px,
//                 (max-width: 1200px) 800px,
//                 (max-width: 1600px) 1200px,
//                 1600px"
//           alt={article.image_credit || cleanText(title)}
//           loading="eager"
//           decoding="async"
//           style={{ backgroundColor: "#eaeaea" }}
//         />
//       )}

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

//       <Excerpt
//         dangerouslySetInnerHTML={{
//           __html: excerpt || "",
//         }}
//       />

//       {category === "products" && source_url && (
//         <SourceLink href={source_url} target="_blank" rel="noopener noreferrer">
//           See featured product →
//         </SourceLink>
//       )}

//       {hashtags && (
//         <p
//           style={{
//             fontSize: "0.8rem",
//             color: "var(--color-muted)",
//             textAlign: "center",
//             marginTop: "40px",
//           }}
//         >
//           {hashtags}
//         </p>
//       )}

//       {category?.toLowerCase() === "products" && (
//         <p
//           style={{
//             fontSize: "0.6rem",
//             color: "var(--color-muted)",
//             textAlign: "center",
//             marginTop: "0px",
//             fontStyle: "italic",
//             lineHeight: "1.4",
//           }}
//         >
//           As an Amazon Associate, CurioWire earns from qualifying purchases.
//         </p>
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
  Published,
  RelatedSection,
  RelatedTitle,
  RelatedGrid,
  RelatedCard,
  RelatedImage,
  RelatedText,
  RelatedImageOverlay,
} from "./ArticlePage.styles";
import { cleanText } from "../../app/api/utils/cleanText";
import { CategoryBadge } from "./ArticlePage.styles";

export default function ArticlePage({
  article: initialArticle,
  nextArticle: initialNext,
}) {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();
  const [article, setArticle] = useState(initialArticle || null);
  const [nextArticle, setNextArticle] = useState(initialNext || null);
  const [relatedArticles, setRelatedArticles] = useState([]);

  useEffect(() => {
    if (!id) return;

    const fetchArticleAndNext = async () => {
      try {
        let current = initialArticle;

        // 🔹 Hent artikkel dersom ikke sendt som prop
        if (!current) {
          const { data, error } = await supabase
            .from("articles")
            .select("*")
            .eq("id", id)
            .single();

          if (error || !data) {
            console.error("❌ Could not fetch article:", error?.message);
            return;
          }

          current = data;
          setArticle(data);
        }

        // 🔹 Logg visning (kun i browser)
        if (typeof window !== "undefined") {
          try {
            const res = await fetch("/api/logView", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ articleId: Number(id) }),
            });

            if (!res.ok) {
              const json = await res.json();
              console.warn("⚠️ logView failed:", res.status, json);
            }
          } catch (err) {
            console.error("⚠️ logView request error:", err);
          }
        }

        // 🔹 Finn neste artikkel i samme kategori
        const { data: nextData } = await supabase
          .from("articles")
          .select("id, title")
          .eq("category", current.category)
          .gt("created_at", current.created_at)
          .order("created_at", { ascending: true })
          .limit(1);

        if (nextData?.length) {
          setNextArticle(nextData[0]);
        } else {
          // fallback: første artikkel i kategorien
          const { data: first } = await supabase
            .from("articles")
            .select("id, title")
            .eq("category", current.category)
            .order("created_at", { ascending: true })
            .limit(1);

          if (first?.length) setNextArticle(first[0]);
        }

        // 🔹 Finn relaterte artikler i samme kategori
        const { data: related } = await supabase
          .from("articles")
          .select("id, title, image_url, created_at")
          .eq("category", current.category)
          .neq("id", current.id)
          .order("created_at", { ascending: false })
          .limit(3);

        if (related) setRelatedArticles(related);
      } catch (err) {
        console.error("⚠️ fetchArticleAndNext error:", err);
      }
    };

    fetchArticleAndNext();
  }, [id, initialArticle]);

  if (!article) return <Wrapper>Loading curiosity...</Wrapper>;

  const {
    category,
    title,
    excerpt,
    image_url,
    created_at,
    source_url,
    seo_title,
    seo_description,
    seo_keywords,
    hashtags,
  } = article;

  const formattedDate = new Date(created_at).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <Wrapper>
      <Headline>Extra! Extra!</Headline>
      <SubIntro>{getCategoryIntro(category)}</SubIntro>
      <Divider />

      <Title>{cleanText(title)}</Title>
      <Published>
        <CategoryBadge $category={category}>{category}</CategoryBadge>
        Published {formattedDate}
      </Published>

      {image_url && (
        <Image
          src={`${image_url}?width=1200&quality=80&format=webp`}
          srcSet={`
            ${image_url}?width=400&quality=70&format=webp 400w,
            ${image_url}?width=800&quality=75&format=webp 800w,
            ${image_url}?width=1200&quality=80&format=webp 1200w,
            ${image_url}?width=1600&quality=85&format=webp 1600w
          `}
          sizes="(max-width: 600px) 400px,
                (max-width: 1200px) 800px,
                (max-width: 1600px) 1200px,
                1600px"
          alt={article.image_credit || cleanText(title)}
          loading="eager"
          decoding="async"
          style={{ backgroundColor: "#eaeaea" }}
        />
      )}

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

      <Excerpt
        dangerouslySetInnerHTML={{
          __html: excerpt || "",
        }}
      />

      {category === "products" && source_url && (
        <SourceLink href={source_url} target="_blank" rel="noopener noreferrer">
          See featured product →
        </SourceLink>
      )}

      {/* {hashtags && (
        <p
          style={{
            fontSize: "0.8rem",
            color: "var(--color-muted)",
            textAlign: "center",
            marginTop: "40px",
          }}
        >
          {hashtags}
        </p>
      )} */}

      {category?.toLowerCase() === "products" && (
        <p
          style={{
            fontSize: "0.6rem",
            color: "var(--color-muted)",
            textAlign: "center",
            marginTop: "0px",
            fontStyle: "italic",
            lineHeight: "1.4",
          }}
        >
          As an Amazon Associate, CurioWire earns from qualifying purchases.
        </p>
      )}

      {relatedArticles.length > 0 && (
        <RelatedSection>
          <RelatedTitle>Want to explore further?</RelatedTitle>
          <RelatedGrid>
            {relatedArticles.map((a) => (
              <RelatedCard key={a.id} href={`/article/${a.id}`}>
                {a.image_url && (
                  <>
                    <RelatedImage
                      src={`${a.image_url}?width=400&quality=70&format=webp`}
                      alt={cleanText(a.title)}
                      loading="lazy"
                    />
                    <RelatedImageOverlay />
                  </>
                )}
                <RelatedText>
                  {cleanText(a.title)}
                  <span className="arrow"> →</span>
                </RelatedText>
              </RelatedCard>
            ))}
          </RelatedGrid>
        </RelatedSection>
      )}

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
