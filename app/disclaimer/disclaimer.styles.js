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
  text-transform: uppercase;
`;

export const Paragraph = styled.p`
  font-family: ${({ theme }) => theme.fonts.body};
  margin-bottom: 20px;
  line-height: 1.7;
  color: ${({ theme }) => theme.colors.text};
`;

export const SectionTitle = styled.h2`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1.1rem;
  margin-top: 40px;
  margin-bottom: 10px;
  color: ${({ theme }) => theme.colors.accent};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;
