// components/ArticleQuestions/ArticleQuestions.styles.js
"use client";

import styled from "styled-components";

export const Wrap = styled.section`
  margin-top: 34px;
  border-top: 1px solid
    ${({ theme }) => theme.colors.border || "rgba(0,0,0,0.10)"};
`;

export const Title = styled.h2`
  position: relative;
  font-family: "Playfair Display", serif;
  font-size: 1.35rem;
  margin-top: 0;
`;

export const List = styled.div`
  display: grid;
  gap: 10px;
  margin-top: 18px;
`;

export const QuestionLink = styled.a`
  display: block;
  padding: 14px 16px;
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.bgAlt};
  color: inherit;
  text-decoration: none;
  line-height: 1.35;
  font-weight: 600;

  &:hover {
    text-decoration: underline;
  }
`;
