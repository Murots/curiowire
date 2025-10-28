"use client";

import Head from "next/head";
import Link from "next/link";
import {
  Wrapper,
  Title,
  Info,
  CategoryList,
  CategoryItem,
} from "./sitemap.styles";
import { categories } from "@/app/api/utils/categories";

/**
 * 📜 Sitemap hovedside (Client Component)
 * Viser oversikt over alle CurioWire-kategorier.
 * Brukeren kan klikke seg inn på hver kategori for å se artiklene.
 */

export default function SitemapPage() {
  return (
    <>
      <Head>
        <title>Sitemap — CurioWire</title>
        <meta
          name="description"
          content="Explore all CurioWire categories and articles — automatically updated with every new publication."
        />
        <meta
          name="keywords"
          content="CurioWire sitemap, AI news archive, AI journalism, categories, automated newspaper, science, technology, history"
        />
        <meta property="og:title" content="Sitemap — CurioWire" />
        <meta
          property="og:description"
          content="A structured index of all CurioWire articles, organized by category and updated dynamically."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://curiowire.com/sitemap" />
      </Head>

      <Wrapper>
        <Title>CurioWire Sitemap</Title>

        <Info>
          Explore the world of CurioWire — stories organized by category,
          updated automatically as new articles are generated.
        </Info>

        <CategoryList>
          {Object.keys(categories).map((key) => (
            <CategoryItem key={key}>
              <Link href={`/sitemap/${key}`}>
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </Link>
            </CategoryItem>
          ))}
        </CategoryList>

        <Info>
          Looking for the XML version for search engines?{" "}
          <a href="/api/sitemap" target="_blank" rel="noopener noreferrer">
            View sitemap.xml
          </a>
        </Info>
      </Wrapper>
    </>
  );
}
