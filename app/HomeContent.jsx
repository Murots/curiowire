"use client";

import { Wrapper, Headline, Grid, Loader } from "./page.styles";
import ArticleCard from "@/components/ArticleCard/ArticleCard";

export default function HomeContent({ articles }) {
  if (!articles || articles.length === 0)
    return <Loader>Fetching this week’s top curiosities...</Loader>;

  return (
    <Wrapper>
      <Headline>🔥 Trending curiosities</Headline>
      <Grid>
        {articles.map((a, i) => (
          <ArticleCard
            key={a.id}
            id={a.id}
            category={a.category}
            title={a.title}
            excerpt={a.excerpt}
            image_url={a.image_url}
            created_at={a.created_at}
            index={i}
          />
        ))}
      </Grid>
    </Wrapper>
  );
}
