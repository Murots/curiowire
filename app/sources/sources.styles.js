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

export const SectionTitle = styled.h2`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1.3rem;
  margin: 40px 0 10px 0;
  color: ${({ theme }) => theme.colors.accent};
`;

export const List = styled.ul`
  list-style: none;
  padding: 0;
  margin-bottom: 20px;
`;

export const ListItem = styled.li`
  margin-bottom: 8px;
  font-family: ${({ theme }) => theme.fonts.body};
  color: ${({ theme }) => theme.colors.text};
`;
