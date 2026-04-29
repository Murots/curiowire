"use client";

// app/questions/questions.styles.js
import Link from "next/link";
import styled from "styled-components";
import { getCategoryColor } from "@/lib/categoryColors";

export const BreadcrumbSlot = styled.div`
  width: 100%;
  background-color: ${({ theme }) => theme.colors.muted};
`;

export const PageShell = styled.main`
  padding: 3rem 15% 6rem 15%;
  max-width: 1600px;
  margin: 0 auto;

  @media (max-width: 770px) {
    padding: 4rem 5% 4rem 5%;
  }
`;

export const Hero = styled.header`
  max-width: 1200px;
  margin: 0 auto 34px;
  padding-bottom: 26px;
  border-bottom: 1px solid
    ${({ theme }) => theme.colors.border || "rgba(0,0,0,0.10)"};
`;

export const Kicker = styled.p`
  font-family: ${({ theme }) => theme.fonts.body};
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.76rem;
  color: ${({ theme }) => theme.colors.accent};
  margin: 0 0 12px;
  font-weight: 700;
`;

export const HeroTitle = styled.h1`
  font-family: ${({ theme }) => theme.fonts.heading};
  color: ${({ theme }) => theme.colors.text};
  font-size: clamp(2.2rem, 5vw, 4.1rem);
  line-height: 1.04;
  letter-spacing: -0.03em;
  margin: 0;
  max-width: 800px;
`;

export const HeroText = styled.p`
  font-family: ${({ theme }) => theme.fonts.body};
  margin: 18px 0 0;
  font-size: 1.06rem;
  line-height: 1.7;
  max-width: 690px;
  color: ${({ theme }) => theme.colors.text};
  opacity: 0.78;
`;

export const CategoryNav = styled.nav`
  max-width: 1200px;
  margin: 0 auto 32px;
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
`;

export const CategoryChip = styled(Link)`
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 8px 13px;

  background: ${({ $active, $category, theme }) => {
    if (!$active) return theme.colors.bgAlt;
    if ($category === "all") return theme.colors.accent;
    return getCategoryColor($category) || theme.colors.accent;
  }};

  border: 1px solid
    ${({ $active, $category, theme }) => {
      if (!$active) return theme.colors.border || "rgba(0,0,0,0.10)";
      if ($category === "all") return theme.colors.accent;
      return getCategoryColor($category) || theme.colors.accent;
    }};

  color: ${({ $active, theme }) =>
    $active ? theme.colors.bg : theme.colors.text};

  text-decoration: none;
  font-family: ${({ theme }) => theme.fonts.body};
  font-size: 0.88rem;
  line-height: 1;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};

  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease;

  &:hover {
    transform: translateY(-1px);
    text-decoration: none;
  }
`;

export const CountNote = styled.div`
  max-width: 1200px;
  margin: -10px auto 18px;
  font-family: ${({ theme }) => theme.fonts.body};
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.text};
  opacity: 0.62;
`;

export const EmptyState = styled.p`
  max-width: 1200px;
  margin: 0 auto;
  font-family: ${({ theme }) => theme.fonts.body};
  color: ${({ theme }) => theme.colors.text};
  opacity: 0.72;
  line-height: 1.7;
`;
