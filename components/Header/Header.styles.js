import styled from "styled-components";
import Link from "next/link";

export const HeaderWrapper = styled.header`
  background: ${({ theme }) => theme.colors.card};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: ${({ theme }) => theme.shadow};
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 10;
`;

export const Logo = styled.h1`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1.8rem;
  color: ${({ theme }) => theme.colors.text};
`;

export const Nav = styled.nav`
  display: flex;
  flex-wrap: wrap;
  gap: 1.2rem;
`;

export const NavLink = styled(Link)`
  color: ${({ theme, $active }) =>
    $active ? theme.colors.link : theme.colors.text};
  font-weight: ${({ $active }) => ($active ? "700" : "500")};
  border-bottom: ${({ $active, theme }) =>
    $active ? `2px solid ${theme.colors.link}` : "2px solid transparent"};
  transition: 0.2s;

  &:hover {
    color: ${({ theme }) => theme.colors.link};
    border-bottom: 2px solid ${({ theme }) => theme.colors.link};
  }
`;
