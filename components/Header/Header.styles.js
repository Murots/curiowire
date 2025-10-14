import styled from "styled-components";

export const HeaderWrapper = styled.header`
  width: 100%;
  //   background: var(--color-bg);
  background: #f9f9fb;
  border-bottom: 1px solid var(--color-muted);
  padding: 20px 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  position: sticky;
  top: 0;
  z-index: 10;
`;

export const Logo = styled.h1`
  font-family: "Playfair Display", serif;
  font-size: 2rem;
  margin: 0;

  a {
    color: var(--color-text);
    text-decoration: none;
  }

  a:hover {
    color: var(--color-accent);
  }
`;

export const Nav = styled.nav`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 14px;
`;

export const NavItem = styled.span`
  font-family: "Inter", sans-serif;
  font-size: 0.95rem;
  text-transform: capitalize;

  a {
    text-decoration: none;
    color: var(--color-text);
    font-weight: 500;
  }

  a:hover {
    color: var(--color-accent);
  }
`;
