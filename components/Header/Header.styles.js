// components/Header/Header.styles.js
import styled from "styled-components";

export const HeaderWrapper = styled.header`
  width: 100%;
  background: ${({ theme }) => theme.colors.bgAlt || "#e9e9e9"};
  position: sticky;
  top: 0;
  z-index: 50;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
`;

export const Inner = styled.div`
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;

  padding: 14px 18px;
  display: flex;
  align-items: center;
  gap: 14px;

  position: relative;
`;

export const Logo = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;

  a {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  img {
    display: block;
    height: 28px;
    width: auto;
  }

  @media (max-width: 770px) {
    img {
      height: 26px;
    }
  }
`;

export const DesktopSearchWrap = styled.div`
  margin-left: auto;
  position: relative;
  width: min(350px, 100%);

  @media (max-width: 770px) {
    display: none;
  }
`;

export const SearchInput = styled.input`
  width: 100%;
  border: 1px solid rgba(0, 0, 0, 0.14);
  background: rgba(255, 255, 255, 0.65);
  border-radius: 18px;
  padding: 8px 38px 8px 12px;

  font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial,
    sans-serif;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.text};

  &:focus {
    outline: none;
    border-color: rgba(0, 0, 0, 0.22);
    background: rgba(255, 255, 255, 0.8);
  }
`;

export const ClearButton = styled.button`
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);

  width: 28px;
  height: 28px;
  border-radius: 999px;
  border: 0;
  cursor: pointer;

  background: rgba(0, 0, 0, 0.08);
  color: rgba(0, 0, 0, 0.75);

  &:hover {
    background: rgba(0, 0, 0, 0.12);
  }
`;

export const FilterButton = styled.button`
  display: none;
  border: 0;
  background: transparent;
  cursor: pointer;

  color: ${({ theme }) => theme.colors.text};
  padding: 6px;
  border-radius: 10px;

  &:hover {
    background: rgba(0, 0, 0, 0.06);
  }

  @media (max-width: 770px) {
    display: inline-flex;
    align-items: center;
    justify-content: center;

    /* header should show logo + filter icon */
    margin-left: auto;
  }
`;

export const MobileMenu = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(6px);
  z-index: 80;

  display: flex;
  justify-content: flex-end;
`;

export const MobilePanel = styled.div`
  width: min(520px, 92vw);
  height: 100vh;
  background: rgba(249, 249, 251, 0.98);

  padding: 18px;
  position: relative;

  box-shadow: -20px 0 60px rgba(0, 0, 0, 0.25);

  animation: cwSlideInRight 220ms cubic-bezier(0.22, 1, 0.36, 1);

  @keyframes cwSlideInRight {
    from {
      transform: translateX(18px);
      opacity: 0.85;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;

export const CloseMobile = styled.button`
  position: absolute;
  right: 14px;
  top: 14px;

  border: 0;
  background: rgba(0, 0, 0, 0.08);
  width: 36px;
  height: 36px;
  border-radius: 10px;
  cursor: pointer;

  &:hover {
    background: rgba(0, 0, 0, 0.12);
  }
`;

export const MobileTitle = styled.div`
  font-family: "Playfair Display", serif;
  font-size: 1.25rem;
  font-weight: 700;
  margin: 6px 0 14px;
`;

export const MobileSearchWrap = styled.div`
  position: relative;
  margin: 10px 0 18px;
`;

export const MobileRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 14px 0;
`;

export const MobileLabel = styled.div`
  font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial,
    sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.62);
  letter-spacing: 0.02em;
`;

export const MobileSelect = styled.select`
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;

  background-color: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.14);
  color: ${({ theme }) => theme.colors.text};

  padding: 11px 42px 11px 12px;
  border-radius: 6px;

  font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial,
    sans-serif;
  font-size: 0.85rem;
  font-weight: 500;

  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  background-size: 16px;

  &:focus {
    outline: none;
    border-color: rgba(0, 0, 0, 0.22);
  }
`;
