// components/ArticleModal/ArticleModal.styles.js
import styled, { css } from "styled-components";

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

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.62);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;

  ${({ $soft }) =>
    $soft
      ? css`
          opacity: 1;
          animation: none;
        `
      : css`
          opacity: 0;
          animation: cwFadeIn 140ms ease-out forwards;

          @keyframes cwFadeIn {
            to {
              opacity: 1;
            }
          }
        `}

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 1;
  }
`;

export const Modal = styled.div`
  width: min(980px, 100%);
  max-height: calc(100vh - 36px);
  overflow: auto;

  background: rgba(255, 255, 255, 0.98);
  border-radius: 14px;
  box-shadow: 0 35px 110px rgba(0, 0, 0, 0.45);
  position: relative;

  ${({ $soft }) =>
    $soft
      ? css`
          transform: none;
          opacity: 1;
          animation: none;
        `
      : css`
          transform: translateY(6px) scale(0.985);
          opacity: 0;
          animation: cwPopIn 170ms ease-out forwards;

          @keyframes cwPopIn {
            to {
              transform: translateY(0) scale(1);
              opacity: 1;
            }
          }
        `}

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transform: none;
    opacity: 1;
  }
`;

export const CloseWrap = styled.div`
  position: sticky;
  top: 0;
  z-index: 6;

  /* IMPORTANT: do not push content down */
  height: 0;
  pointer-events: none;

  /* anchor for the absolute button */
  position: sticky;
`;

export const Close = styled.button`
  position: absolute;
  right: 14px;
  top: 14px;

  pointer-events: auto;

  border: 0;
  background: #d8d8d8;
  border-radius: 10px;
  padding: 8px 10px;
  cursor: pointer;

  &:hover {
    background: #cccccc;
  }
`;

/* ✅ Soft “swap” animation for modal->modal content only */
export const Swap = styled.div`
  ${({ $soft }) =>
    $soft
      ? css`
          animation: cwSwap 150ms ease-out;
          @keyframes cwSwap {
            from {
              opacity: 0.85;
              transform: translateY(2px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `
      : css`
          animation: none;
        `}

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const ModalHeader = styled.div`
  padding: 22px 22px 10px 22px;
`;

/* ---------------------------------------------
   HEADLINE (Extra! Extra!)
---------------------------------------------- */
export const Headline = styled.div`
  font-family: "Playfair Display", serif;
  font-size: 1.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: ${({ theme }) => theme.colors.special || theme.colors.accent};
`;

/* ---------------------------------------------
   SUBINTRO (emoji headline / category intro)
---------------------------------------------- */
export const SubIntro = styled.p`
  margin: 10px 0 0 0;
  color: ${({ theme }) => theme.colors.text};
  font-style: italic;
  font-size: 1.1rem;

  &::first-letter {
    font-style: normal;
  }
`;

export const Divider = styled.div`
  width: 90px;
  height: 3px;
  border-radius: 3px;
  margin: 0px 0 16px;
  background: ${({ theme }) => theme.colors.accent};
`;

export const ModalTitle = styled.h1`
  margin: 0;
  font-family: "Playfair Display", serif;
  font-size: 2.4rem;
  line-height: 1.18;
`;

export const MetaRow = styled.div`
  margin-top: 12px;
  font-family:
    Inter,
    system-ui,
    -apple-system,
    Segoe UI,
    Roboto,
    Arial,
    sans-serif;
  font-size: 0.9rem;
  color: rgba(0, 0, 0, 0.55);
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 10px;
  text-transform: uppercase;

  .date {
    text-transform: none;
    letter-spacing: 0;
  }
`;

export const CategoryBadge = styled.span`
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 700;
  color: white;
  line-height: 1;

  ${({ $category }) => {
    const color =
      categoryColors[String($category || "").toLowerCase()] || "#666";
    return css`
      background: ${color};
    `;
  }}

  text-shadow: 0 1px 20px rgb(0, 0, 0);
`;

export const Image = styled.img`
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  object-position: 50% 30%;
  display: block;
  background: #eaeaea;
  margin-top: 14px;
`;

export const Credit = styled.div`
  font-size: 0.82rem;
  opacity: 0.75;
  font-style: italic;
  padding: 10px 22px 0 22px;

  a {
    color: ${({ theme }) => theme.colors.accent};
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }
`;

export const Body = styled.div`
  padding: 18px 22px 26px 22px;
  line-height: 1.78;
  color: ${({ theme }) => theme.colors.text};
  font-size: 1.05rem;

  p {
    margin-bottom: 1.6rem;
  }

  h2 {
    font-family: "Playfair Display", serif;
    font-size: 1.5rem;
    margin: 2.2rem 0 0;
    position: relative;
  }

  /* ----------- Summary Box ------------- */
  .article-summary-box {
    background: ${({ theme }) => theme.colors.bgAlt};
    border-left: 5px solid ${({ theme }) => theme.colors.accent};
    border-radius: 10px;
    padding: 20px 24px;
    margin: 24px 0 34px;
    font-size: 0.95rem;

    strong {
      display: block;
      font-family: "Playfair Display", serif;
      font-size: 1.05rem;
      margin-bottom: 12px;
    }

    ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    li {
      margin-bottom: 8px;
      line-height: 1.5;
    }

    li b {
      color: ${({ theme }) => theme.colors.accent};
      font-weight: 700;
      margin-right: 4px;
    }
  }
`;

export const NavBar = styled.div`
  position: sticky;
  bottom: 0;
  z-index: 6;

  display: flex;
  gap: 10px;
  justify-content: space-between;
  align-items: center;

  padding: 8px 16px;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.98);

  backdrop-filter: blur(6px);
`;

export const NavButton = styled.button`
  border: 1px solid rgba(0, 0, 0, 0.14);
  background: #fff;
  border-radius: 12px;
  padding: 8px 12px;
  cursor: pointer;

  font-family:
    Inter,
    system-ui,
    -apple-system,
    Segoe UI,
    Roboto,
    Arial,
    sans-serif;
  font-weight: 500;
  font-size: 0.8rem;

  display: inline-flex;
  align-items: center;
  gap: 8px;

  &:hover {
    border-color: #cccccc;
    background-color: ${({ theme }) => theme.colors.bgAlt};
  }

  &:disabled {
    opacity: 0.45;
    cursor: default;
    transform: none;
  }
`;

export const NavHint = styled.div`
  font-size: 0.7rem;
  color: rgba(0, 0, 0, 0.5);
  font-family:
    Inter,
    system-ui,
    -apple-system,
    Segoe UI,
    Roboto,
    Arial,
    sans-serif;
  font-weight: 500;
`;

/* ============================================================
   RELATED ARTICLES
============================================================ */

export const RelatedSection = styled.section`
  margin-top: 34px;
  border-top: 1px solid
    ${({ theme }) => theme.colors.border || "rgba(0,0,0,0.10)"};
`;

export const RelatedTitle = styled.h2`
  position: relative;
  font-family: "Playfair Display", serif;
  font-size: 1.35rem;
  margin-top: 0px;
`;

export const RelatedGrid = styled.div`
  display: grid;
  width: 100%;
  margin: 30px 0;

  /* gap skalerer pent med viewport */
  gap: clamp(12px, 2vw, 20px);

  /* 3 kolonner på desktop når det er plass */
  grid-template-columns: repeat(3, minmax(0, 1fr));

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

export const RelatedCard = styled.a`
  position: relative;
  text-decoration: none;
  color: inherit;
  border-radius: 12px;
  overflow: hidden;
  background: ${({ theme }) => theme.colors.bgAlt};
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease;

  /* hindrer "gigantisk" feeling ved få kort, men fyller fortsatt cellen */
  max-width: 420px;
  width: 100%;
  justify-self: start;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.12);
  }

  &:hover .arrow {
    transform: translateX(4px);
    opacity: 1;
  }

  @media (max-width: 560px) {
    max-width: 520px;
    justify-self: stretch;
  }
`;

export const RelatedImage = styled.img`
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  display: block;
`;

export const RelatedImageOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0) 10%,
    rgb(0, 0, 0) 100%
  );
  pointer-events: none;
`;

export const RelatedText = styled.div`
  position: absolute;
  bottom: 0;
  padding: 14px 16px 16px;
  font-size: 0.95rem;
  line-height: 1.35;
  font-weight: 600;
  color: white;
  z-index: 2;

  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);

  .arrow {
    display: inline-block;
    margin-left: 6px;
    opacity: 0.6;
    font-size: 1.15em;
    transition:
      transform 0.2s ease,
      opacity 0.2s ease;
  }

  /* ✅ ONLY on direct article pages */
  [data-variant="page"] & {
    font-size: 0.88rem;
    line-height: 1.3;
  }
`;
