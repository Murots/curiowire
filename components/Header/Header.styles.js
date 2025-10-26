import styled from "styled-components";
import Link from "next/link";

export const HeaderWrapper = styled.header`
  width: 100%;
  background: ${({ theme }) => theme.colors.bgAlt || "#e9e9e9"};
  // border-bottom: 1px solid ${({ theme }) => theme.colors.muted || "#ccc"};
  padding: 20px 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  position: sticky;
  top: 0;
  z-index: 10;
`;

export const Logo = styled.p`
  margin: 0;

  a,
  a:link,
  a:visited,
  a:hover,
  a:focus,
  a:active {
    color: ${({ theme }) => theme.colors.text};
    text-decoration: none;
    font-size: 2rem;
    font-family: "Playfair Display", "Poppins", serif;
    font-weight: 700;
    cursor: pointer;
  }
`;

export const Nav = styled.nav`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 18px;
`;

export const NavLink = styled(Link)`
  position: relative;
  font-family: "Inter", sans-serif;
  font-size: 0.95rem;
  text-transform: capitalize;
  text-decoration: none;
  color: ${({ theme }) => theme.colors.text};
  font-weight: 500;
  padding-bottom: 4px;
  transition: color 0.2s ease;

  &::after {
    content: "";
    position: absolute;
    left: 0;
    bottom: 2px;
    width: 0%;
    height: 2px;
    background-color: ${({ theme }) => theme.colors.accent};
    transition: width 0.25s ease;
  }

  &:hover {
    color: ${({ theme }) => theme.colors.accent};
  }

  &:hover::after {
    width: 100%;
  }

  &.active {
    color: ${({ theme }) => theme.colors.accent};
  }

  &.active::after {
    width: 100%;
  }
`;
