// components/Breadcrumbs/Breadcrumbs.styles.js
import styled from "styled-components";
import Link from "next/link";

export const Nav = styled.nav`
  width: 100%;
  max-width: 1400px;
  margin-left: auto;
  margin-right: auto;
  padding: 3px 18px;
`;

export const List = styled.ol`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
`;

export const Item = styled.li`
  display: inline-flex;
  align-items: center;
  min-width: 0;
`;

export const CrumbLink = styled(Link)`
  color: ${({ theme }) => theme.colors.bg};
  text-decoration: none;
  font-size: 0.72rem;
  line-height: 1.35;
  letter-spacing: 0.01em;
  transition:
    color 0.18s ease,
    opacity 0.18s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.bg};
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  &:focus-visible {
    outline: 2px solid rgba(149, 1, 14, 0.35);
    outline-offset: 2px;
    border-radius: 3px;
  }
`;

export const Current = styled.span`
  color: ${({ theme }) => theme.colors.bg};
  font-size: 0.77rem;
  line-height: 1.35;
  letter-spacing: 0.01em;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: min(62vw, 420px);
`;

export const Separator = styled.span`
  color: ${({ theme }) => theme.colors.bg};
  font-size: 0.72rem;
  line-height: 1;
  margin: 0 3px;
  user-select: none;
`;
