// components/QuestionAccordion/QuestionAccordion.styles.js
"use client";

import styled from "styled-components";

export const AccordionWrap = styled.section`
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  gap: 12px;
`;

export const QuestionItem = styled.article`
  scroll-margin-top: 96px;
  border: 1px solid
    ${({ $open, theme }) =>
      $open ? theme.colors.accent : theme.colors.border || "rgba(0,0,0,0.10)"};
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.bg};
  overflow: hidden;
`;

export const QuestionButton = styled.button`
  width: 100%;
  border: 0;
  background: transparent;
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  padding: 16px 18px;

  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;

  text-align: left;

  &:hover {
    background: ${({ theme }) => theme.colors.bgAlt};
  }
`;

export const QuestionText = styled.span`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: clamp(1.08rem, 2.2vw, 1.32rem);
  line-height: 1.25;
  letter-spacing: -0.01em;
  font-weight: 700;
`;

export const Icon = styled.span`
  flex: 0 0 auto;
  width: 28px;
  height: 28px;
  border-radius: 999px;

  display: inline-flex;
  align-items: center;
  justify-content: center;

  background: ${({ theme }) => theme.colors.bgAlt};
  color: ${({ theme }) => theme.colors.accent};
  font-family: ${({ theme }) => theme.fonts.body};
  font-size: 1.25rem;
  line-height: 1;
  font-weight: 700;
`;

export const AnswerPanel = styled.div`
  padding: 0 18px 18px;
  border-top: 1px solid
    ${({ theme }) => theme.colors.border || "rgba(0,0,0,0.08)"};
`;

export const AnswerText = styled.p`
  margin: 16px 0 0;
  font-family: ${({ theme }) => theme.fonts.body};
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.75;
  font-size: 1rem;
`;

export const MetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-top: 14px;
  font-family: ${({ theme }) => theme.fonts.body};
  font-size: 0.84rem;
  color: ${({ theme }) => theme.colors.text};
  opacity: 0.64;
`;

export const MetaLink = styled.a`
  color: inherit;
  text-decoration: none;

  &:hover {
    opacity: 1;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
`;

export const MetaDot = styled.span`
  opacity: 0.55;
`;
