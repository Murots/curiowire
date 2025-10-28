"use client";

import styled from "styled-components";
import Link from "next/link";

/* === WRAPPER === */
export const Wrapper = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  background: ${({ theme }) => theme.colors.bg};
  color: ${({ theme }) => theme.colors.text};
  font-family: "Inter", sans-serif;
  line-height: 1.6;

  @media (max-width: 768px) {
    padding: 40px 15px 60px;
  }
`;

/* === TITLE === */
export const Title = styled.h1`
  font-family: "Playfair Display", serif;
  font-size: 2.4rem;
  text-align: center;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 12px;

  @media (max-width: 600px) {
    font-size: 2rem;
  }
`;

/* === INFO TEXT === */
export const Info = styled.p`
  text-align: center;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 1rem;
  margin: 0 auto 50px;
  max-width: 700px;
  line-height: 1.5;

  a {
    color: ${({ theme }) => theme.colors.accent};
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }
`;

/* === CATEGORY HEADERS === */
export const Category = styled.h2`
  font-family: "Playfair Display", serif;
  font-size: 1.4rem;
  margin: 50px 0 20px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.muted};
  padding-bottom: 6px;
  color: ${({ theme }) => theme.colors.text};
  text-transform: uppercase;

  @media (max-width: 600px) {
    font-size: 1.2rem;
  }
`;

/* === ARTICLE LIST === */
export const List = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

export const Item = styled.li`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px dashed ${({ theme }) => theme.colors.muted};
  transition: background 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.bgAlt};
  }
`;

export const LinkStyled = styled(Link)`
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;
  font-weight: 500;
  flex: 1;
  margin-right: 10px;
  transition: color 0.2s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.accent};
  }
`;

export const Timestamp = styled.span`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.muted};
  min-width: 90px;
  text-align: right;
`;

/* === CATEGORY LINK LIST (used on /sitemap) === */
export const CategoryList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 auto 60px;
  text-align: center;
`;

export const CategoryItem = styled.li`
  display: inline-block;
  margin: 10px 15px;

  a {
    color: ${({ theme }) => theme.colors.accent};
    font-weight: 600;
    text-decoration: none;
    font-size: 1.1rem;
    transition: opacity 0.25s ease, color 0.25s ease;

    &:hover {
      color: ${({ theme }) => theme.colors.text};
      opacity: 0.8;
    }
  }
`;

/* === PAGINATION === */
export const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 40px;
  gap: 30px;
  flex-wrap: wrap;
`;

export const PageButton = styled(Link)`
  color: ${({ theme }) => theme.colors.accent};
  font-weight: 500;
  text-decoration: none;
  padding: 6px 14px;
  border: 1px solid ${({ theme }) => theme.colors.accent};
  border-radius: 4px;
  transition: all 0.25s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.accent};
    color: ${({ theme }) => theme.colors.bg};
  }
`;
