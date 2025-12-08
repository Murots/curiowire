// "use client";

// import React, { useEffect, useState } from "react";
// import { useParams, useSearchParams } from "next/navigation";
// import { createClient } from "@supabase/supabase-js";
// import {
//   Wrapper,
//   Title,
//   Info,
//   List,
//   Item,
//   LinkStyled,
//   Timestamp,
//   Pagination,
//   PageButton,
// } from "../sitemap.styles";

// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL,
//   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
// );

// const PAGE_SIZE = 20;

// export default function SitemapCategoryContent() {
//   const { category } = useParams();
//   const searchParams = useSearchParams();
//   const page = parseInt(searchParams.get("page") || "1", 10);

//   const [articles, setArticles] = useState([]);
//   const [totalCount, setTotalCount] = useState(0);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const fetchArticles = async () => {
//       setLoading(true);
//       const start = (page - 1) * PAGE_SIZE;
//       const end = start + PAGE_SIZE - 1;

//       const { data, count, error } = await supabase
//         .from("articles")
//         .select("id, title, created_at", { count: "exact" })
//         .eq("category", category)
//         .order("created_at", { ascending: false })
//         .range(start, end);

//       if (error) console.error("❌ Error fetching articles:", error.message);
//       setArticles(data || []);
//       setTotalCount(count || 0);
//       setLoading(false);
//     };

//     fetchArticles();
//   }, [category, page]);

//   const totalPages = Math.ceil(totalCount / PAGE_SIZE);

//   if (loading)
//     return (
//       <Wrapper>
//         <Info>Loading {category} sitemap...</Info>
//       </Wrapper>
//     );

//   return (
//     <Wrapper>
//       <Title>{category.charAt(0).toUpperCase() + category.slice(1)}</Title>
//       <Info>
//         Showing {articles.length} of {totalCount} articles
//       </Info>

//       {articles.length === 0 ? (
//         <Info>No articles found in this category yet.</Info>
//       ) : (
//         <List>
//           {articles.map((a) => (
//             <Item key={a.id}>
//               <LinkStyled href={`/article/${a.id}`}>
//                 {a.title || "Untitled"}
//               </LinkStyled>
//               <Timestamp>
//                 {new Date(a.created_at).toLocaleDateString()}
//               </Timestamp>
//             </Item>
//           ))}
//         </List>
//       )}

//       {totalPages > 1 && (
//         <Pagination>
//           {page > 1 && (
//             <PageButton href={`/sitemap/${category}?page=${page - 1}`}>
//               ← Previous
//             </PageButton>
//           )}
//           <span>
//             Page {page} of {totalPages}
//           </span>
//           {page < totalPages && (
//             <PageButton href={`/sitemap/${category}?page=${page + 1}`}>
//               Next →
//             </PageButton>
//           )}
//         </Pagination>
//       )}
//     </Wrapper>
//   );
// }
"use client";

import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import {
  Wrapper,
  Title,
  Info,
  List,
  Item,
  LinkStyled,
  Timestamp,
  Pagination,
  PageButton,
} from "../sitemap.styles";

// CLIENT-SIDE SUPABASE CLIENT (correct)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const PAGE_SIZE = 20;

export default function SitemapCategoryContent() {
  const { category } = useParams();
  const searchParams = useSearchParams();
  const page = parseInt(searchParams.get("page") || "1", 10);

  const [articles, setArticles] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function fetchArticles() {
      setLoading(true);
      const start = (page - 1) * PAGE_SIZE;
      const end = start + PAGE_SIZE - 1;

      const result = await supabase
        .from("articles")
        .select("id, title, created_at", { count: "exact" })
        .eq("category", category)
        .order("created_at", { ascending: false })
        .range(start, end);

      if (!isActive) return;

      if (result.error) {
        console.error("❌ Error fetching articles:", result.error.message);
      }

      // Null-safe handling
      const safeArticles = Array.isArray(result.data) ? result.data : [];
      const safeCount = typeof result.count === "number" ? result.count : 0;

      setArticles(safeArticles);
      setTotalCount(safeCount);
      setLoading(false);
    }

    fetchArticles();
    return () => {
      isActive = false;
    };
  }, [category, page]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  if (loading) {
    return (
      <Wrapper>
        <Info>Loading {category} sitemap...</Info>
      </Wrapper>
    );
  }

  const formattedCategory =
    category.charAt(0).toUpperCase() + category.slice(1);

  return (
    <Wrapper>
      <Title>{formattedCategory}</Title>

      <Info>
        Showing {articles.length} of {totalCount} articles
      </Info>

      {articles.length === 0 ? (
        <Info>No articles found in this category yet.</Info>
      ) : (
        <List>
          {articles.map((a) => (
            <Item key={a.id}>
              <LinkStyled href={`/article/${a.id}`}>
                {a.title || "Untitled"}
              </LinkStyled>
              <Timestamp>
                {a.created_at
                  ? new Date(a.created_at).toLocaleDateString()
                  : "Unknown date"}
              </Timestamp>
            </Item>
          ))}
        </List>
      )}

      {totalPages > 1 && (
        <Pagination>
          {page > 1 && (
            <PageButton href={`/sitemap/${category}?page=${page - 1}`}>
              ← Previous
            </PageButton>
          )}

          <span>
            Page {page} of {totalPages}
          </span>

          {page < totalPages && (
            <PageButton href={`/sitemap/${category}?page=${page + 1}`}>
              Next →
            </PageButton>
          )}
        </Pagination>
      )}
    </Wrapper>
  );
}
