// app/questions/page.jsx
import Script from "next/script";
import Breadcrumbs from "@/components/Breadcrumbs/Breadcrumbs";
import { supabaseServer } from "@/lib/supabaseServer";
import QuestionAccordion from "@/components/QuestionAccordion/QuestionAccordion";
import {
  BreadcrumbSlot,
  PageShell,
  Hero,
  Kicker,
  HeroTitle,
  HeroText,
  CategoryNav,
  CategoryChip,
  EmptyState,
  CountNote,
} from "./questions.styles";

export const revalidate = 900;

const PAGE_SIZE = 100;

const CATEGORIES = [
  "science",
  "technology",
  "space",
  "nature",
  "health",
  "history",
  "culture",
  "sports",
  "products",
  "world",
  "crime",
  "mystery",
];

function cleanText(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCategory(input) {
  const v = String(input || "")
    .toLowerCase()
    .trim();
  return CATEGORIES.includes(v) ? v : "";
}

function questionHref(q) {
  const category = normalizeCategory(q?.category);
  const slug = String(q?.slug || "").trim();

  if (!category || !slug) return "/questions";

  return `/questions/${category}#${slug}`;
}

function categoryLabel(category) {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export async function generateMetadata() {
  const baseUrl = "https://curiowire.com";

  return {
    title: { absolute: "Questions & Answers | CurioWire" },
    description:
      "Explore curious questions and clear answers connected to CurioWire stories.",
    alternates: {
      canonical: `${baseUrl}/questions`,
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      type: "website",
      title: "Questions & Answers | CurioWire",
      description:
        "Explore curious questions and clear answers connected to CurioWire stories.",
      url: `${baseUrl}/questions`,
      siteName: "CurioWire",
      images: [{ url: `${baseUrl}/OMImage.png` }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Questions & Answers | CurioWire",
      description:
        "Explore curious questions and clear answers connected to CurioWire stories.",
      images: [`${baseUrl}/OMImage.png`],
    },
  };
}

export default async function QuestionsPage({ searchParams }) {
  const baseUrl = "https://curiowire.com";

  const sp = await Promise.resolve(searchParams);
  const category = normalizeCategory(sp?.category);

  const sb = supabaseServer();

  let query = sb
    .from("article_questions")
    .select(
      `
      id,
      card_id,
      category,
      question,
      answer,
      slug,
      source_url,
      position,
      created_at,
      curiosity_cards (
        id,
        title,
        image_url,
        category
      )
    `,
    )
    .eq("status", "published")
    .eq("is_indexed", true)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;

  const questions = !error && Array.isArray(data) ? data : [];

  const pageUrl = category
    ? `${baseUrl}/questions?category=${encodeURIComponent(category)}`
    : `${baseUrl}/questions`;

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: category ? `CurioWire ${category} questions` : "CurioWire Questions",
    url: pageUrl,
    inLanguage: "en",
    description:
      "A collection of curiosity-driven questions and answers from CurioWire.",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: questions.length,
      itemListElement: questions.map((q, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${baseUrl}${questionHref(q)}`,
        name: cleanText(q.question),
      })),
    },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.slice(0, 20).map((q) => ({
      "@type": "Question",
      name: cleanText(q.question),
      acceptedAnswer: {
        "@type": "Answer",
        text: cleanText(q.answer),
      },
    })),
  };

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Questions" },
  ];

  return (
    <>
      <Script
        id="structured-data-questions"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(itemListJsonLd),
        }}
      />

      <Script
        id="faq-data"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd),
        }}
      />

      <BreadcrumbSlot>
        <Breadcrumbs items={breadcrumbItems} />
      </BreadcrumbSlot>

      <PageShell>
        <Hero>
          <Kicker>CurioWire Answers</Kicker>

          <HeroTitle>Curious questions, clear answers</HeroTitle>

          <HeroText>
            A growing library of short answers connected to CurioWire stories,
            organized around the topics readers keep searching for.
          </HeroText>
        </Hero>

        <CategoryNav aria-label="Question categories">
          <CategoryChip href="/questions" $active={!category} $category="all">
            All
          </CategoryChip>

          {CATEGORIES.map((cat) => (
            <CategoryChip key={cat} href={`/questions/${cat}`} $category={cat}>
              {categoryLabel(cat)}
            </CategoryChip>
          ))}
        </CategoryNav>

        {questions.length ? (
          <>
            <CountNote>
              Showing {questions.length} recent question
              {questions.length === 1 ? "" : "s"}.
            </CountNote>

            <QuestionAccordion questions={questions} />
          </>
        ) : (
          <EmptyState>No questions published yet.</EmptyState>
        )}
      </PageShell>
    </>
  );
}
