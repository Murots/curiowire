"use client";

import styled from "styled-components";

export const MainWrapper = styled.div`
  padding: 3rem 15% 6rem 15%;
  max-width: 1600px;
  margin: 0 auto;

  @media (max-width: 770px) {
    padding: 4rem 5% 4rem 5%;
  }
`;

export const BreadcrumbSlot = styled.div`
  width: 100%;
  padding: 3px 20px;
  background-color: ${({ theme }) => theme.colors.muted};
`;

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

export const List = styled.ul`
  margin-left: 20px;
  margin-bottom: 20px;
`;

export const ListItem = styled.li`
  margin-bottom: 6px;
  font-family: ${({ theme }) => theme.fonts.body};
  color: ${({ theme }) => theme.colors.text};
`;
