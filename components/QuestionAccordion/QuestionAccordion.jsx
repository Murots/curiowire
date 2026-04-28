// components/QuestionAccordion/QuestionAccordion.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AccordionWrap,
  QuestionItem,
  QuestionButton,
  QuestionText,
  Icon,
  AnswerPanel,
  AnswerText,
  MetaRow,
  MetaLink,
  MetaDot,
} from "./QuestionAccordion.styles";

function cleanText(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCategory(input) {
  return String(input || "")
    .toLowerCase()
    .trim();
}

function normalizeSlug(input) {
  return String(input || "")
    .trim()
    .replace(/^#/, "");
}

function safeUrl(value) {
  const url = String(value || "").trim();

  if (!/^https?:\/\/\S+$/i.test(url)) return "";

  return url;
}

export default function QuestionAccordion({ questions = [] }) {
  const items = useMemo(() => {
    return Array.isArray(questions)
      ? questions
          .filter((q) => q?.question && q?.answer && q?.slug)
          .map((q) => ({
            id: q.id || q.slug,
            slug: normalizeSlug(q.slug),
            category: normalizeCategory(q.category),
            question: cleanText(q.question),
            answer: cleanText(q.answer),

            sourceUrl: safeUrl(q.source_url),

            articleId: q.curiosity_cards?.id || q.card_id || null,
            articleTitle: cleanText(q.curiosity_cards?.title || ""),
          }))
      : [];
  }, [questions]);

  const [openSlug, setOpenSlug] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncFromHash = () => {
      const hash = normalizeSlug(window.location.hash);
      if (!hash) return;

      const exists = items.some((item) => item.slug === hash);
      if (!exists) return;

      setOpenSlug(hash);

      requestAnimationFrame(() => {
        const el = document.getElementById(hash);

        el?.scrollIntoView({
          block: "start",
          behavior: "smooth",
        });
      });
    };

    syncFromHash();

    window.addEventListener("hashchange", syncFromHash);

    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [items]);

  if (!items.length) return null;

  return (
    <AccordionWrap>
      {items.map((item) => {
        const isOpen = openSlug === item.slug;
        const panelId = `answer-${item.slug}`;

        return (
          <QuestionItem key={item.id} id={item.slug} $open={isOpen}>
            <QuestionButton
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => {
                const next = isOpen ? "" : item.slug;

                setOpenSlug(next);

                if (typeof window !== "undefined" && next) {
                  window.history.replaceState(null, "", `#${next}`);
                }
              }}
            >
              <QuestionText>{item.question}</QuestionText>

              <Icon aria-hidden="true">{isOpen ? "−" : "+"}</Icon>
            </QuestionButton>

            {isOpen ? (
              <AnswerPanel id={panelId}>
                <AnswerText>{item.answer}</AnswerText>

                <MetaRow>
                  {item.sourceUrl ? (
                    <MetaLink
                      href={item.sourceUrl}
                      target="_blank"
                      rel="nofollow noopener noreferrer"
                    >
                      Source
                    </MetaLink>
                  ) : null}

                  {item.articleId ? (
                    <>
                      {item.sourceUrl ? <MetaDot>·</MetaDot> : null}

                      <MetaLink href={`/article/${item.articleId}`}>
                        Related article
                      </MetaLink>
                    </>
                  ) : null}
                </MetaRow>
              </AnswerPanel>
            ) : null}
          </QuestionItem>
        );
      })}
    </AccordionWrap>
  );
}
