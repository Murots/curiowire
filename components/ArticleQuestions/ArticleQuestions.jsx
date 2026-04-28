// components/ArticleQuestions/ArticleQuestions.jsx
"use client";

import { cleanText } from "@/app/api/utils/cleanText";
import { Wrap, Title, List, QuestionLink } from "./ArticleQuestions.styles";

export default function ArticleQuestions({ questions = [], category }) {
  const cat = String(category || "")
    .toLowerCase()
    .trim();

  const visible = Array.isArray(questions)
    ? questions.filter((q) => q?.question && q?.slug).slice(0, 5)
    : [];

  if (!visible.length || !cat) return null;

  return (
    <Wrap>
      <Title>Related questions</Title>

      <List>
        {visible.map((q) => (
          <QuestionLink
            key={q.id || q.slug}
            href={`/questions/${cat}#${q.slug}`}
          >
            {cleanText(q.question)}
          </QuestionLink>
        ))}
      </List>
    </Wrap>
  );
}
