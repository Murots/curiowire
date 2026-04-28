// app/questions/[category]/page.jsx
import Script from "next/script";
import { notFound } from "next/navigation";
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
} from "../questions.styles";

export const revalidate = 900;
export const dynamicParams = false;

const ALLOWED = new Set([
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
]);

const CATEGORIES = Array.from(ALLOWED);

function normalizeCategory(input) {
  const v = String(input || "")
    .toLowerCase()
    .trim();
  return ALLOWED.has(v) ? v : null;
}

function cleanText(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function categoryLabel(category) {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export async function generateStaticParams() {
  return CATEGORIES.map((category) => ({ category }));
}

async function getCategory(params) {
  const p = await Promise.resolve(params);
  return p?.category;
}

export async function generateMetadata({ params }) {
  const baseUrl = "https://curiowire.com";
  const category = normalizeCategory(await getCategory(params));

  if (!category) {
    return {
      robots: { index: false, follow: false },
    };
  }

  const label = categoryLabel(category);
  const url = `${baseUrl}/questions/${category}`;

  return {
    title: { absolute: `${label} Questions — CurioWire` },
    description: `Explore ${label.toLowerCase()} questions and clear answers connected to CurioWire stories.`,
    alternates: {
      canonical: url,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    openGraph: {
      type: "website",
      title: `${label} Questions — CurioWire`,
      description: `Explore ${label.toLowerCase()} questions and clear answers connected to CurioWire stories.`,
      url,
      siteName: "CurioWire",
      images: [{ url: `${baseUrl}/OMImage.png` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${label} Questions — CurioWire`,
      description: `Explore ${label.toLowerCase()} questions and clear answers connected to CurioWire stories.`,
      images: [`${baseUrl}/OMImage.png`],
    },
  };
}

export default async function CategoryQuestionsPage({ params }) {
  const baseUrl = "https://curiowire.com";

  const category = normalizeCategory(await getCategory(params));
  if (!category) notFound();

  const label = categoryLabel(category);
  const pageUrl = `${baseUrl}/questions/${category}`;

  const sb = supabaseServer();

  const { data, error } = await sb
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
        category,
        image_url
      )
    `,
    )
    .eq("status", "published")
    .eq("is_indexed", true)
    .eq("category", category)
    .order("created_at", { ascending: false })
    .order("position", { ascending: true });

  const questions = !error && Array.isArray(data) ? data : [];

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${pageUrl}#faq`,
    url: pageUrl,
    name: `${label} Questions — CurioWire`,
    inLanguage: "en",
    mainEntity: questions.map((q) => ({
      "@type": "Question",
      name: cleanText(q.question),
      acceptedAnswer: {
        "@type": "Answer",
        text: cleanText(q.answer),
      },
    })),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${baseUrl}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Questions",
        item: `${baseUrl}/questions`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: label,
        item: pageUrl,
      },
    ],
  };

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Questions", href: "/questions" },
    { label },
  ];

  return (
    <>
      <Script
        id={`structured-data-questions-${category}`}
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([faqJsonLd, breadcrumbJsonLd]),
        }}
      />

      <BreadcrumbSlot>
        <Breadcrumbs items={breadcrumbItems} />
      </BreadcrumbSlot>

      <PageShell>
        <Hero>
          <Kicker>CurioWire Answers</Kicker>

          <HeroTitle>{label} questions and answers</HeroTitle>

          <HeroText>
            A focused collection of clear answers connected to CurioWire{" "}
            {category} stories and nearby search topics.
          </HeroText>
        </Hero>

        <CategoryNav aria-label="Question categories">
          <CategoryChip href="/questions" $category="all">
            All
          </CategoryChip>

          {CATEGORIES.map((cat) => (
            <CategoryChip
              key={cat}
              href={`/questions/${cat}`}
              $active={cat === category}
              $category={cat}
            >
              {categoryLabel(cat)}
            </CategoryChip>
          ))}
        </CategoryNav>

        {questions.length ? (
          <>
            <CountNote>
              Showing {questions.length} {label.toLowerCase()} question
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
