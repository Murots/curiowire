// components/CurioCard/CurioCard.styles.js
import styled, { css } from "styled-components";
import Link from "next/link";

const categoryColors = {
  science: "#005ae0", // blå, litt dypere / mer seriøs
  space: "#9d00db", // kosmisk lilla med mer dybde
  history: "#b07a22", // mørkere bronse, mindre “bling”
  nature: "#008f45", // grønn med mer jord
  world: "#c90500", // dypere signal-rød

  technology: "#0099d9", // cyan-blå, mindre neon
  culture: "#e84f1b", // oransje med mer varme enn lys
  health: "#c8006a", // magenta med mer tyngde
  sports: "#009f80", // teal, mer moden

  products: "#e6b800", // gull-gul, mindre skrikende
  crime: "#775232", // nesten-svart blå (noir)
  mystery: "#00d6d6", // cyan med litt demping
};

/**
 * ✅ IMPORTANT:
 * CardLink is the actual GRID ITEM (direct child of Grid).
 * So grid-column MUST live here — not on Card.
 */
export const CardLink = styled(Link)`
  display: block;
  width: 100%;
  min-width: 0; /* prevents grid overflow squeezing/weirdness */
  text-decoration: none;
  color: inherit;

  /* feed grid */
  grid-column: ${({ $wide }) => ($wide ? "span 12" : "span 6")};

  @media (max-width: 780px) {
    grid-column: span 12;
  }

  /* ✅ keyboard focus ring on the link itself */
  &:focus-visible {
    outline: 2px solid rgba(149, 1, 14, 0.6);
    outline-offset: 3px;
    border-radius: 8px;
  }
`;

export const Card = styled.article`
  position: relative;
  width: 100%;
  height: 100%;

  display: flex;
  flex-direction: column;

  border-radius: 6px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.55);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.06);

  cursor: pointer;
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease;

  ${CardLink}:hover & {
    transform: translateY(-3px);
    box-shadow: 0 14px 34px rgba(0, 0, 0, 0.1);
  }
`;

export const ImageWrapper = styled.div`
  position: relative;
  overflow: hidden;
  background-color: #eaeaea;

  /* ✅ identisk bildevisning på alle cards */
  aspect-ratio: 16 / 10;

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0) 45%,
      rgb(0, 0, 0) 100%
    );
    pointer-events: none;
  }
`;

export const Image = styled.img`
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  object-position: center;

  transition:
    transform 0.6s ease,
    filter 0.35s ease;

  ${CardLink}:hover & {
    transform: scale(1.04);
    filter: brightness(1.06);
  }
`;

export const FireBadge = styled.div`
  position: absolute;
  right: 12px;
  top: 12px;
  z-index: 3;

  font-size: 1.05rem;
  line-height: 1;
  padding: 6px 8px;
  border-radius: 999px;

  color: #fff;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(6px);
`;

export const MetaRow = styled.div`
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: 12px;
  z-index: 3;

  display: flex;
  align-items: center;
  gap: 10px;

  font-family:
    Inter,
    system-ui,
    -apple-system,
    Segoe UI,
    Roboto,
    Arial,
    sans-serif;
  font-size: 0.78rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.88);

  .date {
    /* ✅ dette gjør dato ikke-uppercase */
    text-transform: none;
    letter-spacing: 0.02em;
    margin-left: auto;
    opacity: 0.95;
  }

  span {
    text-shadow: 0 1px 20px rgb(0, 0, 0);
  }
`;

export const CategoryBadge = styled.span`
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 800;
  color: white;
  line-height: 1;

  ${({ $category }) => {
    const color =
      categoryColors[String($category || "").toLowerCase()] || "#666";
    return css`
      background: ${color};
    `;
  }}
`;

export const Content = styled.div`
  display: flex;
  flex-direction: column;

  /* ✅ tar all remaining space under bildet */
  flex: 1;

  /* ✅ viktig i flex layouts for å unngå rare overflow/line-clamp issues */
  min-height: 0;

  padding: 14px 16px 16px;
`;

export const Title = styled.h2`
  margin: 0;
  line-height: 1.25;
  font-weight: 750;
  color: var(--color-text);
  font-size: 1.35rem;

  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

export const Ingress = styled.p`
  margin: 10px 0 0 0;
  color: rgba(0, 0, 0, 0.75);
  font-size: 0.8rem;
  line-height: 1.45;
  font-style: italic;

  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

export const ReadMore = styled.span`
  margin-top: auto;
  padding-top: 12px;

  font-family:
    Inter,
    system-ui,
    -apple-system,
    Segoe UI,
    Roboto,
    Arial,
    sans-serif;
  font-weight: 450;
  color: var(--color-muted);
  font-size: 0.78rem;

  text-decoration: underline;
  text-underline-offset: 3px;
  transition:
    color 0.2s ease,
    transform 0.25s ease;

  ${CardLink}:hover & {
    color: var(--color-accent);
    transform: translateX(3px);
  }
`;
