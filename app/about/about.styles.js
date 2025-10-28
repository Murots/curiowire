"use client";

import styled from "styled-components";

export const Wrapper = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  background: ${({ theme }) => theme.colors.bg};
  color: ${({ theme }) => theme.colors.text};
`;

export const Headline = styled.h1`
  font-family: ${({ theme }) => theme.fonts.heading};
  text-align: center;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 40px;
`;

export const Paragraph = styled.p`
  font-family: ${({ theme }) => theme.fonts.body};
  margin-bottom: 20px;
  line-height: 1.7;
  color: ${({ theme }) => theme.colors.text};
`;

export const Highlight = styled.span`
  color: ${({ theme }) => theme.colors.accent};
  font-weight: bold;
`;
