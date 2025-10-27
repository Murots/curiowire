import styled from "styled-components";
import Link from "next/link";

export const HeaderWrapper = styled.header`
  width: 100%;
  background: ${({ theme }) => theme.colors.bgAlt || "#e9e9e9"};

  padding: 16px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  position: sticky;
  top: 0;
  z-index: 50;
`;

export const Logo = styled.p`
  margin: 0;
  a {
    color: ${({ theme }) => theme.colors.text};
    text-decoration: none;
    font-size: 1.5rem;
    font-family: "Playfair Display", "Poppins", serif;
    font-weight: 700;
    cursor: pointer;
  }
`;

export const NavLink = styled(Link)`
  position: relative;
  font-family: "Inter", sans-serif;
  font-size: 0.8rem;
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

export const Hamburger = styled.button`
  display: none;
  background: none;
  border: none;
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  position: absolute;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 60;

  @media (max-width: 770px) {
    display: block;
  }
`;

export const MobileMenu = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: 100%;
  background: rgba(249, 249, 251, 0.95);
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  z-index: 55;
  animation: slideInLeft 0.4s cubic-bezier(0.22, 1, 0.36, 1);

  @keyframes slideInLeft {
    0% {
      opacity: 0;
      transform: translateX(-100%);
    }
    100% {
      opacity: 1;
      transform: translateX(0);
    }
  }

  a {
    font-size: 0.8rem;
    color: ${({ theme }) => theme.colors.text};
    text-decoration: none;
    transition: color 0.2s ease;
  }

  a:hover {
    color: ${({ theme }) => theme.colors.accent};
  }
`;

// Gjør desktop-nav synlig bare på større skjermer
export const Nav = styled.nav`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 18px;

  @media (max-width: 770px) {
    display: none;
  }
`;
