// components/FeedInterrupt/VideoCarouselBlock.styles.js
import styled, { css, keyframes } from "styled-components";
import Link from "next/link";

const slideInFromRight = keyframes`
  from {
    opacity: 0.72;
    transform: translateX(10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const slideInFromLeft = keyframes`
  from {
    opacity: 0.72;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

export const CarouselShell = styled.div`
  position: relative;
  margin-top: 18px;
  padding: 0 52px;

  @media (max-width: 780px) {
    padding: 0 8px;
    margin-top: 16px;
  }
`;

export const CarouselViewport = styled.div`
  position: relative;
  overflow: hidden;
`;

export const CarouselStage = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  min-height: 100%;

  @media (max-width: 780px) {
    gap: 0;
  }
`;

export const Slide = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  transition:
    transform 0.22s ease,
    opacity 0.22s ease,
    filter 0.22s ease;

  animation: ${({ $direction }) =>
      $direction === "prev" ? slideInFromLeft : slideInFromRight}
    220ms ease-out;

  ${({ $isMobile, $slot }) => {
    if ($isMobile) {
      return css`
        width: min(100%, 250px);
        margin: 0 auto;
      `;
    }

    if ($slot === "center") {
      return css`
        width: 252px;
        opacity: 1;
        transform: scale(1);
        filter: none;
        z-index: 2;
      `;
    }

    return css`
      width: 224px;
      opacity: 0.68;
      transform: scale(0.975);
      filter: grayscale(0.04);
      z-index: 1;
    `;
  }}

  @media (max-width: 1100px) and (min-width: 781px) {
    ${({ $slot }) =>
      $slot === "center"
        ? css`
            width: 236px;
          `
        : css`
            width: 208px;
          `}
  }
`;

export const NavButton = styled.button`
  position: absolute;
  top: 50%;
  ${({ $side }) => ($side === "left" ? "left: 0;" : "right: 0;")}
  transform: translateY(-50%);
  z-index: 4;

  width: 40px;
  height: 40px;
  border-radius: 999px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.9);

  display: inline-flex;
  align-items: center;
  justify-content: center;

  cursor: pointer;

  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.72),
    0 8px 18px rgba(0, 0, 0, 0.06);

  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease;

  /* ytre trekant = mørkere kant */
  &::before {
    content: "";
    position: absolute;
    width: 0;
    height: 0;

    border-top: 9px solid transparent;
    border-bottom: 9px solid transparent;

    ${({ $side }) =>
      $side === "left"
        ? css`
            border-right: 13px solid rgba(52, 52, 52, 0.88);
            margin-left: -2px;
          `
        : css`
            border-left: 13px solid rgba(52, 52, 52, 0.88);
            margin-right: -2px;
          `}
    filter: drop-shadow(0 1px 1px rgba(255, 255, 255, 0.22));
    transition: border-color 0.18s ease;
  }

  /* indre trekant = lysere fyll */
  &::after {
    content: "";
    position: absolute;
    width: 0;
    height: 0;

    border-top: 7px solid transparent;
    border-bottom: 7px solid transparent;

    ${({ $side }) =>
      $side === "left"
        ? css`
            border-right: 10px solid rgba(118, 118, 118, 0.92);
            margin-left: -1px;
          `
        : css`
            border-left: 10px solid rgba(118, 118, 118, 0.92);
            margin-right: -1px;
          `}
    filter: blur(0.15px);
    transition: border-color 0.18s ease;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.98);
    border-color: rgba(149, 1, 14, 0.16);
    transform: translateY(-50%) scale(1.03);

    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.82),
      0 12px 22px rgba(0, 0, 0, 0.08);
  }

  &:hover::before {
    ${({ $side }) =>
      $side === "left"
        ? css`
            border-right-color: rgba(149, 1, 14, 0.88);
          `
        : css`
            border-left-color: rgba(149, 1, 14, 0.88);
          `}
  }

  &:hover::after {
    ${({ $side }) =>
      $side === "left"
        ? css`
            border-right-color: rgba(205, 80, 92, 0.95);
          `
        : css`
            border-left-color: rgba(205, 80, 92, 0.95);
          `}
  }

  @media (max-width: 780px) {
    width: 36px;
    height: 36px;
    ${({ $side }) => ($side === "left" ? "left: -2px;" : "right: -2px;")}

    &::before {
      border-top-width: 8px;
      border-bottom-width: 8px;

      ${({ $side }) =>
        $side === "left"
          ? css`
              border-right-width: 12px;
            `
          : css`
              border-left-width: 12px;
            `}
    }

    &::after {
      border-top-width: 6px;
      border-bottom-width: 6px;

      ${({ $side }) =>
        $side === "left"
          ? css`
              border-right-width: 9px;
            `
          : css`
              border-left-width: 9px;
            `}
    }

    &:hover {
      transform: translateY(-50%) scale(1.03);
    }
  }
`;

export const VideoCard = styled(Link)`
  position: relative;
  display: block;
  width: 100%;
  text-decoration: none;
  color: inherit;

  border-radius: 16px;
  overflow: hidden;

  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(0, 0, 0, 0.08);

  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.45),
    0 10px 24px rgba(0, 0, 0, 0.06);

  transition:
    transform 0.22s ease,
    border-color 0.22s ease,
    box-shadow 0.22s ease,
    opacity 0.22s ease,
    filter 0.22s ease;

  ${({ $slot }) =>
    $slot === "center"
      ? css`
          opacity: 1;
          filter: none;
        `
      : css`
          opacity: 0.9;
          filter: saturate(0.98);
        `}

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(149, 1, 14, 0.16);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.55),
      0 16px 30px rgba(0, 0, 0, 0.08);
  }

  &:focus-visible {
    outline: none;
    border-color: ${({ theme }) => theme.colors.accent};
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.55),
      0 0 0 3px rgba(149, 1, 14, 0.12);
  }
`;

export const ThumbWrap = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 9 / 16;
  background: #d8d8de;
  overflow: hidden;
`;

export const ThumbImage = styled.img`
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
`;

export const ThumbOverlay = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.08) 0%,
    rgba(0, 0, 0, 0.05) 34%,
    rgba(0, 0, 0, 0.16) 100%
  );
`;

export const PlayBadge = styled.div`
  position: absolute;
  right: 12px;
  top: 12px;
  z-index: 2;

  width: 40px;
  height: 40px;
  border-radius: 999px;

  display: inline-flex;
  align-items: center;
  justify-content: center;

  font-size: 1rem;
  line-height: 1;

  color: white;
  background: rgba(0, 0, 0, 0.46);
  backdrop-filter: blur(6px);
`;

export const MetaRow = styled.div`
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 74px;
  z-index: 2;

  display: flex;
  align-items: center;
  gap: 8px;
`;

export const CategoryPill = styled.span`
  padding: 6px 10px;
  border-radius: 999px;
  line-height: 1;
  color: white;

  font-family:
    Inter,
    system-ui,
    -apple-system,
    Segoe UI,
    Roboto,
    Arial,
    sans-serif;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;

  background: ${({ theme }) => theme.colors.accent};
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.18);
`;

export const PostedText = styled.span`
  margin-left: auto;
  color: rgba(255, 255, 255, 0.96);

  font-family:
    Inter,
    system-ui,
    -apple-system,
    Segoe UI,
    Roboto,
    Arial,
    sans-serif;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.45);
`;

export const TitlePanel = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2;

  min-height: 66px;
  display: flex;
  align-items: center;
  justify-content: center;

  padding: 11px 12px 12px;
  background: rgba(255, 255, 255, 0.97);
  border-top: 1px solid rgba(0, 0, 0, 0.05);
`;

export const VideoTitle = styled.div`
  color: ${({ theme }) => theme.colors.text};

  font-family: "Playfair Display", serif;
  font-size: 0.98rem;
  font-weight: 700;
  line-height: 1.14;
  letter-spacing: -0.015em;
  text-align: center;

  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;

  @media (max-width: 780px) {
    font-size: 1rem;
  }
`;

export const Dots = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 14px;

  @media (max-width: 780px) {
    margin-top: 14px;
    padding: 0 44px;
  }
`;

export const DotButton = styled.button`
  width: ${({ $active }) => ($active ? "18px" : "8px")};
  height: 8px;
  border-radius: 999px;
  border: 0;
  padding: 0;
  cursor: pointer;

  background: ${({ $active, theme }) =>
    $active ? theme.colors.accent : "rgba(0, 0, 0, 0.16)"};

  transition:
    width 0.18s ease,
    background 0.18s ease,
    transform 0.18s ease;

  &:hover {
    transform: translateY(-1px);
  }
`;
