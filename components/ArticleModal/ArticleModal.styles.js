// // components/ArticleModal/ArticleModal.styles.js
// import styled, { css } from "styled-components";

// const categoryColors = {
//   science: "#005ae0", // blå, litt dypere / mer seriøs
//   space: "#9d00db", // kosmisk lilla med mer dybde
//   history: "#b07a22", // mørkere bronse, mindre “bling”
//   nature: "#008f45", // grønn med mer jord
//   world: "#c90500", // dypere signal-rød

//   technology: "#0099d9", // cyan-blå, mindre neon
//   culture: "#e84f1b", // oransje med mer varme enn lys
//   health: "#c8006a", // magenta med mer tyngde
//   sports: "#009f80", // teal, mer moden

//   products: "#e6b800", // gull-gul, mindre skrikende
//   crime: "#775232", // nesten-svart blå (noir)
//   mystery: "#00d6d6", // cyan med litt demping
// };

// export const Overlay = styled.div`
//   position: fixed;
//   inset: 0;
//   z-index: 9999;
//   background: rgba(0, 0, 0, 0.62);
//   backdrop-filter: blur(3px);
//   display: flex;
//   align-items: center;
//   justify-content: center;
//   padding: 18px;

//   ${({ $soft }) =>
//     $soft
//       ? css`
//           opacity: 1;
//           animation: none;
//         `
//       : css`
//           opacity: 0;
//           animation: cwFadeIn 140ms ease-out forwards;

//           @keyframes cwFadeIn {
//             to {
//               opacity: 1;
//             }
//           }
//         `}

//   @media (prefers-reduced-motion: reduce) {
//     animation: none;
//     opacity: 1;
//   }
// `;

// export const Modal = styled.div`
//   width: min(1080px, 100%);
//   max-height: calc(100vh - 36px);
//   overflow: auto;

//   background: rgba(255, 255, 255, 0.98);
//   border-radius: 14px;
//   box-shadow: 0 35px 110px rgba(0, 0, 0, 0.45);
//   position: relative;

//   ${({ $soft }) =>
//     $soft
//       ? css`
//           transform: none;
//           opacity: 1;
//           animation: none;
//         `
//       : css`
//           transform: translateY(6px) scale(0.985);
//           opacity: 0;
//           animation: cwPopIn 170ms ease-out forwards;

//           @keyframes cwPopIn {
//             to {
//               transform: translateY(0) scale(1);
//               opacity: 1;
//             }
//           }
//         `}

//   @media (prefers-reduced-motion: reduce) {
//     animation: none;
//     transform: none;
//     opacity: 1;
//   }
// `;

// export const CloseWrap = styled.div`
//   position: sticky;
//   top: 0;
//   z-index: 6;

//   /* IMPORTANT: do not push content down */
//   height: 0;
//   pointer-events: none;

//   /* anchor for the absolute button */
//   position: sticky;
// `;

// export const Close = styled.button`
//   position: absolute;
//   right: 14px;
//   top: 27px;

//   pointer-events: auto;

//   border: 0;
//   background: #d8d8d8;
//   border-radius: 10px;
//   padding: 8px 10px;
//   cursor: pointer;

//   &:hover {
//     background: #cccccc;
//   }
// `;

// /* ✅ Soft “swap” animation for modal->modal content only */
// export const Swap = styled.div`
//   ${({ $soft }) =>
//     $soft
//       ? css`
//           animation: cwSwap 150ms ease-out;
//           @keyframes cwSwap {
//             from {
//               opacity: 0.85;
//               transform: translateY(2px);
//             }
//             to {
//               opacity: 1;
//               transform: translateY(0);
//             }
//           }
//         `
//       : css`
//           animation: none;
//         `}

//   @media (prefers-reduced-motion: reduce) {
//     animation: none;
//   }
// `;

// export const ModalHeader = styled.div`
//   padding: 22px 22px 10px 22px;
// `;

// /* ---------------------------------------------
//    HEADLINE (Extra! Extra!)
// ---------------------------------------------- */
// export const Headline = styled.div`
//   font-family: "Playfair Display", serif;
//   font-size: 1.7rem;
//   font-weight: 700;
//   text-transform: uppercase;
//   letter-spacing: 0.1em;
//   color: ${({ theme }) => theme.colors.special || theme.colors.accent};
// `;

// /* ---------------------------------------------
//    SUBINTRO (emoji headline / category intro)
// ---------------------------------------------- */
// export const SubIntro = styled.p`
//   margin: 10px 0 0 0;
//   color: ${({ theme }) => theme.colors.text};
//   font-style: italic;
//   font-size: 1.1rem;

//   &::first-letter {
//     font-style: normal;
//   }
// `;

// export const Divider = styled.div`
//   width: 90px;
//   height: 3px;
//   border-radius: 3px;
//   margin: 0px 0 16px;
//   background: ${({ theme }) => theme.colors.accent};
// `;

// export const ModalTitle = styled.h1`
//   margin: 0;
//   font-family: "Playfair Display", serif;
//   font-size: 2.4rem;
//   line-height: 1.18;
// `;

// export const MetaRow = styled.div`
//   margin-top: 12px;
//   font-family:
//     Inter,
//     system-ui,
//     -apple-system,
//     Segoe UI,
//     Roboto,
//     Arial,
//     sans-serif;
//   font-size: 0.9rem;
//   color: rgba(0, 0, 0, 0.55);
//   letter-spacing: 0.5px;
//   display: flex;
//   align-items: center;
//   gap: 10px;
//   text-transform: uppercase;

//   .date {
//     text-transform: none;
//     letter-spacing: 0;
//   }
// `;

// export const CategoryBadge = styled.span`
//   padding: 6px 8px;
//   border-radius: 4px;
//   font-size: 0.7rem;
//   font-weight: 700;
//   color: white;
//   line-height: 1;

//   transition:
//     transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1),
//     box-shadow 0.18s ease;

//   will-change: transform;

//   ${({ $category }) => {
//     const color =
//       categoryColors[String($category || "").toLowerCase()] || "#666";
//     return css`
//       background: ${color};
//     `;
//   }}

//   text-shadow: 0 1px 20px rgb(0, 0, 0);

//   &:hover {
//     transform: scale(1.06);
//     box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
//   }
// `;
// export const HeroImageWrap = styled.div`
//   width: 100%;
//   aspect-ratio: 16 / 10; /* 👈 match CurioCard */
//   overflow: hidden;
//   background: #eaeaea;
//   margin-top: 14px;
// `;

// export const Image = styled.img
//   .withConfig({
//     shouldForwardProp: (prop) => prop !== "$fetchPriority",
//   })
//   .attrs((props) => ({
//     fetchPriority: props.$fetchPriority,
//   }))`
//   width: 100%;
//   height: 100%;
//   display: block;
//   object-fit: cover;
//   object-position: 50% 30%;
// `;

// export const Credit = styled.div`
//   font-size: 0.82rem;
//   opacity: 0.75;
//   font-style: italic;
//   padding: 10px 22px 0 22px;

//   a {
//     color: ${({ theme }) => theme.colors.accent};
//     text-decoration: none;
//   }

//   a:hover {
//     text-decoration: underline;
//   }
// `;

// export const Body = styled.div`
//   padding: 18px 22px 32px 22px;
//   line-height: 1.82;
//   color: ${({ theme }) => theme.colors.text};
//   font-size: 1.05rem;

//   p {
//     margin: 0 0 1.7rem;
//   }

//   h2 {
//     font-family: "Playfair Display", serif;
//     font-size: 1.58rem;
//     line-height: 1.2;
//     margin: 2.5rem 0 0.35rem;
//     position: relative;
//     letter-spacing: -0.01em;
//   }

//   /* ----------- Summary Box ------------- */
//   .article-summary-box {
//     background: ${({ theme }) => theme.colors.bgAlt};
//     border-left: 5px solid ${({ theme }) => theme.colors.accent};
//     border-radius: 12px;
//     padding: 20px 24px;
//     margin: 26px 0 38px;
//     font-size: 0.96rem;
//     box-shadow: 0 1px 0 rgba(0, 0, 0, 0.03);
//   }

//   .article-summary-box strong {
//     display: block;
//     font-family: "Playfair Display", serif;
//     font-size: 1.08rem;
//     margin-bottom: 12px;
//     letter-spacing: -0.01em;
//   }

//   .article-summary-box ul {
//     list-style: none;
//     padding: 0;
//     margin: 0;
//   }

//   .article-summary-box li {
//     margin-bottom: 8px;
//     line-height: 1.5;
//   }

//   .article-summary-box li b {
//     color: ${({ theme }) => theme.colors.accent};
//     font-weight: 700;
//     margin-right: 4px;
//   }

//   /* ----------- Article Breaks ------------- */
//   .cw-break {
//     position: relative;
//     margin: 40px 0 42px;
//     padding: 24px 30px;
//     border-radius: 18px;
//     background: linear-gradient(
//       to bottom,
//       rgba(255, 255, 255, 0.72),
//       rgba(255, 255, 255, 0.92)
//     );
//     border: 1px solid rgba(0, 0, 0, 0.06);
//     box-shadow:
//       0 1px 0 rgba(0, 0, 0, 0.02),
//       0 10px 24px rgba(0, 0, 0, 0.04);
//     overflow: hidden;
//   }

//   .cw-break::before {
//     content: "";
//     position: absolute;
//     inset: 0 auto 0 0;
//     width: 4px;
//     background: ${({ theme }) => theme.colors.accent};
//     opacity: 0.95;
//   }

//   .cw-break--quote {
//     padding: 32px 34px 30px;
//     background:
//       linear-gradient(
//         to bottom,
//         rgba(255, 255, 255, 0.78),
//         rgba(255, 255, 255, 0.97)
//       ),
//       ${({ theme }) => theme.colors.bgAlt || "#f8f8f6"};
//   }

//   .cw-break--quote::after {
//     content: "“";
//     position: absolute;
//     top: 10px;
//     right: 18px;
//     font-family: "Playfair Display", serif;
//     font-size: 4.5rem;
//     line-height: 1;
//     opacity: 0.1;
//     pointer-events: none;
//   }

//   .cw-break__quote {
//     margin: 0;
//     padding: 0;
//     font-family: "Playfair Display", serif;
//     font-size: 1.52rem;
//     line-height: 1.48;
//     font-weight: 700;
//     font-style: italic;
//     letter-spacing: -0.015em;
//     max-width: 42ch;
//   }

//   .cw-break--hero-number {
//     text-align: center;
//     padding: 32px 24px 30px;
//   }

//   .cw-break--hero-number::before {
//     left: 50%;
//     top: 0;
//     bottom: auto;
//     width: 88px;
//     height: 4px;
//     transform: translateX(-50%);
//     border-radius: 999px;
//   }

//   .cw-break__hero-value {
//     font-family: "Playfair Display", serif;
//     font-size: clamp(3rem, 8vw, 5.8rem);
//     line-height: 0.9;
//     font-weight: 800;
//     letter-spacing: -0.04em;
//     margin: 0;
//     text-wrap: balance;
//   }

//   .cw-break__hero-label {
//     margin-top: 12px;
//     font-size: 1.02rem;
//     font-weight: 700;
//     line-height: 1.35;
//     letter-spacing: -0.01em;
//   }

//   .cw-break__hero-kicker {
//     margin-top: 7px;
//     font-size: 0.92rem;
//     opacity: 0.68;
//     line-height: 1.4;
//     max-width: 28ch;
//     margin-left: auto;
//     margin-right: auto;
//   }

//   .cw-break--timeline {
//     padding: 26px 30px 24px;
//   }

//   .cw-break--timeline .cw-break__inner {
//     position: relative;
//     display: grid;
//     grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
//     gap: 22px;
//     align-items: start;
//   }

//   .cw-break--timeline .cw-break__inner::before {
//     content: "";
//     position: absolute;
//     left: 0;
//     right: 0;
//     top: 12px;
//     height: 2px;
//     background: linear-gradient(
//       to right,
//       ${({ theme }) => theme.colors.accent},
//       rgba(0, 0, 0, 0.14)
//     );
//     opacity: 0.45;
//   }

//   .cw-break__timeline-item {
//     position: relative;
//     padding-top: 26px;
//     padding-left: 0;
//     display: grid;
//     gap: 6px;
//   }

//   .cw-break__timeline-item::before {
//     content: "";
//     position: absolute;
//     left: 0;
//     top: 7px;
//     width: 12px;
//     height: 12px;
//     border-radius: 50%;
//     background: ${({ theme }) => theme.colors.accent};
//     box-shadow: 0 0 0 5px rgba(0, 0, 0, 0.04);
//     z-index: 1;
//   }

//   .cw-break__timeline-label {
//     font-size: 0.76rem;
//     font-weight: 800;
//     text-transform: uppercase;
//     letter-spacing: 0.08em;
//     opacity: 0.6;
//     line-height: 1.15;
//   }

//   .cw-break__timeline-text {
//     font-size: 0.98rem;
//     line-height: 1.48;
//     max-width: 24ch;
//   }

//   .cw-break--map-dot {
//     text-align: center;
//     padding: 28px 22px 26px;
//   }

//   .cw-break--map-dot::before {
//     left: 50%;
//     top: 0;
//     bottom: auto;
//     width: 72px;
//     height: 4px;
//     transform: translateX(-50%);
//     border-radius: 999px;
//   }

//   .cw-break__map-dot-marker {
//     font-size: 2rem;
//     line-height: 1;
//     margin-bottom: 10px;
//     color: ${({ theme }) => theme.colors.accent};
//     text-shadow: 0 0 20px rgba(0, 0, 0, 0.08);
//   }

//   .cw-break__map-dot-place {
//     font-size: 1.03rem;
//     font-weight: 800;
//     line-height: 1.3;
//     letter-spacing: -0.01em;
//   }

//   .cw-break__map-dot-label {
//     margin-top: 5px;
//     font-size: 0.92rem;
//     opacity: 0.68;
//     line-height: 1.4;
//     max-width: 28ch;
//     margin-left: auto;
//     margin-right: auto;
//   }

//   .cw-break--factbox {
//     padding-top: 22px;
//     padding-bottom: 22px;
//   }

//   .cw-break__factbox-head {
//     margin-bottom: 14px;
//   }

//   .cw-break__factbox-title {
//     font-family: "Playfair Display", serif;
//     font-size: 1.18rem;
//     font-weight: 700;
//     line-height: 1.25;
//     letter-spacing: -0.015em;
//   }

//   .cw-break__factbox-type {
//     margin-top: 3px;
//     font-size: 0.76rem;
//     opacity: 0.62;
//     text-transform: uppercase;
//     letter-spacing: 0.08em;
//     line-height: 1.2;
//   }

//   .cw-break__factbox-body {
//     display: grid;
//     gap: 12px;
//   }

//   .cw-break__fact-row {
//     display: grid;
//     gap: 2px;
//     padding-top: 10px;
//     border-top: 1px solid rgba(0, 0, 0, 0.06);
//   }

//   .cw-break__fact-row:first-child {
//     padding-top: 0;
//     border-top: 0;
//   }

//   .cw-break__fact-label {
//     font-size: 0.74rem;
//     font-weight: 800;
//     opacity: 0.62;
//     text-transform: uppercase;
//     letter-spacing: 0.08em;
//     line-height: 1.15;
//   }

//   .cw-break__fact-value {
//     font-size: 0.99rem;
//     line-height: 1.42;
//     letter-spacing: -0.005em;
//   }

//   .cw-inline-image {
//     margin: 34px 0 38px;
//   }

//   .cw-inline-image__wrap {
//     width: 100%;
//     overflow: hidden;
//     border-radius: 14px;
//     background: #eaeaea;
//     aspect-ratio: 16 / 10;
//   }

//   .cw-inline-image__img {
//     width: 100%;
//     height: 100%;
//     display: block;
//     object-fit: cover;
//     object-position: 50% 30%;
//   }

//   .cw-inline-image__credit {
//     font-size: 0.82rem;
//     opacity: 0.75;
//     font-style: italic;
//     margin-top: 10px;
//     line-height: 1.45;
//   }

//   @media (max-width: 770px) {
//     padding: 16px 18px 28px 18px;
//     font-size: 1rem;
//     line-height: 1.75;

//     p {
//       margin-bottom: 1.5rem;
//     }

//     h2 {
//       font-size: 1.42rem;
//       margin: 2.2rem 0 0.3rem;
//     }

//     .article-summary-box {
//       padding: 17px 18px;
//       margin: 22px 0 30px;
//     }

//     .cw-break {
//       margin: 30px 0 32px;
//       padding: 18px 18px;
//       border-radius: 16px;
//     }

//     .cw-break--quote {
//       padding: 22px 20px;
//     }

//     .cw-break--quote::after {
//       font-size: 3.6rem;
//       top: 8px;
//       right: 14px;
//     }

//     .cw-break__quote {
//       font-size: 1.22rem;
//       max-width: none;
//     }

//     .cw-break__hero-value {
//       font-size: clamp(2.5rem, 14vw, 4.4rem);
//     }

//     .cw-break__hero-label {
//       font-size: 0.98rem;
//     }

//     .cw-break--timeline {
//       padding: 20px 18px 18px;
//     }

//     .cw-break--timeline .cw-break__inner {
//       grid-template-columns: 1fr;
//       gap: 18px;
//     }

//     .cw-break--timeline .cw-break__inner::before {
//       left: 4px;
//       right: auto;
//       top: 6px;
//       bottom: 6px;
//       width: 2px;
//       height: auto;
//       background: linear-gradient(
//         to bottom,
//         ${({ theme }) => theme.colors.accent},
//         rgba(0, 0, 0, 0.14)
//       );
//     }

//     .cw-break__timeline-item {
//       padding-top: 0;
//       padding-left: 24px;
//     }

//     .cw-break__timeline-item::before {
//       left: 0;
//       top: 0.45em;
//       width: 10px;
//       height: 10px;
//       box-shadow: 0 0 0 4px rgba(0, 0, 0, 0.04);
//     }

//     .cw-break__timeline-text {
//       max-width: none;
//       font-size: 0.98rem;
//     }

//     .cw-break__fact-value,
//     .cw-break__map-dot-place {
//       font-size: 0.98rem;
//     }
//   }
// `;

// export const NavBar = styled.div`
//   position: sticky;
//   bottom: 0;
//   z-index: 6;

//   display: flex;
//   gap: 10px;
//   justify-content: space-between;
//   align-items: center;

//   padding: 8px 16px;
//   border-top: 1px solid rgba(0, 0, 0, 0.08);
//   background: rgba(255, 255, 255, 0.98);

//   backdrop-filter: blur(6px);

//   @media (max-width: 900px) {
//     padding: 8px 16px 30px 8px;
//   }
// `;

// export const NavButton = styled.button`
//   border: 1px solid rgba(0, 0, 0, 0.14);
//   background: #fff;
//   border-radius: 12px;
//   padding: 8px 12px;
//   cursor: pointer;

//   font-family:
//     Inter,
//     system-ui,
//     -apple-system,
//     Segoe UI,
//     Roboto,
//     Arial,
//     sans-serif;
//   font-weight: 500;
//   font-size: 0.8rem;

//   display: inline-flex;
//   align-items: center;
//   gap: 8px;

//   &:hover {
//     border-color: #cccccc;
//     background-color: ${({ theme }) => theme.colors.bgAlt};
//   }

//   &:disabled {
//     opacity: 0.45;
//     cursor: default;
//     transform: none;
//   }
// `;

// export const NavHint = styled.div`
//   font-size: 0.7rem;
//   color: rgba(0, 0, 0, 0.5);
//   font-family:
//     Inter,
//     system-ui,
//     -apple-system,
//     Segoe UI,
//     Roboto,
//     Arial,
//     sans-serif;
//   font-weight: 500;
// `;

// /* ============================================================
//    RELATED ARTICLES
// ============================================================ */

// export const RelatedSection = styled.section`
//   margin-top: 34px;
//   border-top: 1px solid
//     ${({ theme }) => theme.colors.border || "rgba(0,0,0,0.10)"};
// `;

// export const RelatedTitle = styled.h2`
//   position: relative;
//   font-family: "Playfair Display", serif;
//   font-size: 1.35rem;
//   margin-top: 0px;
// `;

// export const RelatedGrid = styled.div`
//   display: grid;
//   width: 100%;
//   margin: 30px 0;

//   /* gap skalerer pent med viewport */
//   gap: clamp(12px, 2vw, 20px);

//   /* 3 kolonner på desktop når det er plass */
//   grid-template-columns: repeat(3, minmax(0, 1fr));

//   @media (max-width: 900px) {
//     grid-template-columns: repeat(2, minmax(0, 1fr));
//   }

//   @media (max-width: 560px) {
//     grid-template-columns: 1fr;
//   }
// `;

// export const RelatedCard = styled.a`
//   position: relative;
//   text-decoration: none;
//   color: inherit;
//   border-radius: 12px;
//   overflow: hidden;
//   background: ${({ theme }) => theme.colors.bgAlt};
//   transition:
//     transform 0.25s ease,
//     box-shadow 0.25s ease;

//   /* ✅ kortet bestemmer høyden (samme ratio som feed cards) */
//   aspect-ratio: 16 / 10;

//   max-width: 420px;
//   width: 100%;
//   justify-self: start;

//   &:hover {
//     transform: translateY(-3px);
//     box-shadow: 0 10px 28px rgba(0, 0, 0, 0.12);
//   }

//   &:hover .arrow {
//     transform: translateX(4px);
//     opacity: 1;
//   }

//   @media (max-width: 560px) {
//     max-width: 520px;
//     justify-self: stretch;
//   }
// `;

// export const RelatedImage = styled.img`
//   /* ✅ fyll hele kortet (kortet har ratioen) */
//   position: absolute;
//   inset: 0;
//   width: 100%;
//   height: 100%;

//   object-fit: cover;
//   object-position: center 37%;
//   display: block;
// `;

// export const RelatedImageOverlay = styled.div`
//   position: absolute;
//   inset: 0;
//   background: linear-gradient(
//     to bottom,
//     rgba(0, 0, 0, 0) 10%,
//     rgb(0, 0, 0) 100%
//   );
//   pointer-events: none;
// `;

// export const RelatedText = styled.div`
//   position: absolute;
//   bottom: 0;
//   padding: 14px 16px 16px;
//   font-size: 0.95rem;
//   line-height: 1.35;
//   font-weight: 600;
//   color: white;
//   z-index: 2;

//   text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);

//   .arrow {
//     display: inline-block;
//     margin-left: 6px;
//     opacity: 0.6;
//     font-size: 1.15em;
//     transition:
//       transform 0.2s ease,
//       opacity 0.2s ease;
//   }

//   /* ✅ ONLY on direct article pages */
//   [data-variant="page"] & {
//     font-size: 0.88rem;
//     line-height: 1.3;
//   }
// `;

// /* ============================================================
//    ✅ SEO/NAV HELPERS (anchors that keep exact design)
//    Added only — nothing removed.
// ============================================================ */

// /**
//  * Use on an element that wraps the Close UI to become a real <a>/<Link>.
//  * IMPORTANT: keep pointer-events auto (CloseWrap disables pointer events).
//  */
// export const CloseLink = styled.a`
//   position: absolute;
//   right: 14px;
//   top: 27px;

//   pointer-events: auto;

//   border: 0;
//   background: #d8d8d8;
//   border-radius: 10px;
//   padding: 5px 10px;

//   cursor: pointer;
//   color: inherit;
//   text-decoration: none;

//   &:hover {
//     background: #cccccc;
//   }
// `;

// /**
//  * Link styled EXACT like NavButton for Prev/Next anchors.
//  */
// export const NavLink = styled.a`
//   border: 1px solid rgba(0, 0, 0, 0.14);
//   background: #fff;
//   border-radius: 12px;
//   padding: 8px 12px;

//   cursor: pointer;
//   color: inherit;
//   text-decoration: none;

//   font-family:
//     Inter,
//     system-ui,
//     -apple-system,
//     Segoe UI,
//     Roboto,
//     Arial,
//     sans-serif;
//   font-weight: 500;
//   font-size: 0.8rem;

//   display: inline-flex;
//   align-items: center;
//   gap: 8px;

//   &:hover {
//     border-color: #cccccc;
//     background-color: ${({ theme }) => theme.colors.bgAlt};
//   }
// `;

// /**
//  * Non-clickable sibling for disabled Prev/Next, matching :disabled on NavButton.
//  */
// export const NavDisabled = styled.span`
//   border: 1px solid rgba(0, 0, 0, 0.14);
//   background: #fff;
//   border-radius: 12px;
//   padding: 8px 12px;

//   font-family:
//     Inter,
//     system-ui,
//     -apple-system,
//     Segoe UI,
//     Roboto,
//     Arial,
//     sans-serif;
//   font-weight: 500;
//   font-size: 0.8rem;

//   display: inline-flex;
//   align-items: center;
//   gap: 8px;

//   opacity: 0.45;
//   cursor: default;
//   transform: none;
// `;

// /**
//  * Wrapper for CategoryBadge so the badge can become a real link without styling changes.
//  */
// export const CategoryLink = styled.a`
//   display: inline-flex;
//   align-items: center;

//   text-decoration: none;
//   color: inherit;
// `;

// export const VideoWrap = styled.div`
//   margin: 0px auto 0px;

//   position: relative;
//   width: min(100%, 240px);
//   aspect-ratio: 9 / 16; /* Shorts format */

//   border-radius: 12px;
//   overflow: hidden;
//   background: #000;

//   iframe {
//     position: absolute;
//     inset: 0;
//     width: 100%;
//     height: 100%;
//     border: 0;
//   }
// `;

// export const VideoMeta = styled.div`
//   margin-top: 5px;
//   font-size: 0.8rem;
//   opacity: 0.7;
//   text-align: center;

//   a {
//     color: ${({ theme }) => theme.colors.accent};
//     text-decoration: none;
//   }

//   a:hover {
//     text-decoration: underline;
//   }
// `;

// export const QuoteHeroWrap = styled.div`
//   position: relative;
//   width: 100%;
//   aspect-ratio: 16 / 10;
//   margin-top: 14px;
//   overflow: hidden;
//   background: ${({ $bg }) => $bg || "#222"};
//   display: flex;
//   align-items: center;
//   justify-content: center;
//   padding: 40px 28px;
//   border-radius: 0;

//   &::before {
//     content: "“";
//     position: absolute;
//     top: 18px;
//     left: 22px;
//     font-family: "Playfair Display", serif;
//     font-size: clamp(5rem, 10vw, 8rem);
//     line-height: 1;
//     color: rgba(255, 255, 255, 0.14);
//     pointer-events: none;
//   }

//   &::after {
//     content: "”";
//     position: absolute;
//     right: 24px;
//     bottom: 8px;
//     font-family: "Playfair Display", serif;
//     font-size: clamp(5rem, 10vw, 8rem);
//     line-height: 1;
//     color: rgba(255, 255, 255, 0.1);
//     pointer-events: none;
//   }

//   @media (max-width: 770px) {
//     min-height: 280px;
//     padding: 28px 18px;
//   }
// `;

// export const QuoteHeroInner = styled.div`
//   position: relative;
//   z-index: 1;
//   width: min(760px, 100%);
//   text-align: center;
// `;

// export const QuoteHeroKicker = styled.div`
//   margin-bottom: 14px;
//   font-size: 0.74rem;
//   font-weight: 800;
//   letter-spacing: 0.14em;
//   text-transform: uppercase;
//   color: rgba(255, 255, 255, 0.82);
//   font-family:
//     Inter,
//     system-ui,
//     -apple-system,
//     Segoe UI,
//     Roboto,
//     Arial,
//     sans-serif;
// `;

// export const QuoteHeroText = styled.blockquote`
//   margin: 0;
//   color: white;
//   font-family: "Playfair Display", serif;
//   font-size: clamp(1.35rem, 3.6vw, 3rem);
//   line-height: 1.24;
//   font-weight: 700;
//   letter-spacing: -0.02em;
//   text-wrap: balance;
// `;

// export const QuoteHeroAttribution = styled.div`
//   margin-top: 18px;
//   color: rgba(255, 255, 255, 0.9);
//   font-family: "Playfair Display", serif;
//   font-size: 1rem;
//   line-height: 1.2;
//   text-align: center;
// `;

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
  width: min(1080px, 100%);
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
  top: 27px;

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

  transition:
    transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1),
    box-shadow 0.18s ease;

  will-change: transform;

  ${({ $category }) => {
    const color =
      categoryColors[String($category || "").toLowerCase()] || "#666";
    return css`
      background: ${color};
    `;
  }}

  text-shadow: 0 1px 20px rgb(0, 0, 0);

  &:hover {
    transform: scale(1.06);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
  }
`;

export const HeroImageWrap = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10; /* 👈 match CurioCard */
  overflow: hidden;
  background: ${({ $portrait }) => ($portrait ? "#111" : "#eaeaea")};
  margin-top: 14px;
`;

export const HeroPortraitBackdrop = styled.div`
  position: absolute;
  inset: 0;
  z-index: 0;

  background-image: url("${({ $src }) => $src}");
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;

  transform: scale(1.12);
  filter: blur(22px) saturate(1.05) brightness(0.8);
  opacity: 0.96;
  pointer-events: none;
`;

export const Image = styled.img
  .withConfig({
    shouldForwardProp: (prop) =>
      prop !== "$fetchPriority" && prop !== "$portrait",
  })
  .attrs((props) => ({
    fetchPriority: props.$fetchPriority,
  }))`
  position: relative;
  z-index: 1;

  width: 100%;
  height: 100%;
  display: block;

  object-fit: ${({ $portrait }) => ($portrait ? "contain" : "cover")};
  object-position: ${({ $portrait }) =>
    $portrait ? "center center" : "50% 30%"};
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
  padding: 18px 22px 32px 22px;
  line-height: 1.82;
  color: ${({ theme }) => theme.colors.text};
  font-size: 1.05rem;

  p {
    margin: 0 0 1.7rem;
  }

  h2 {
    font-family: "Playfair Display", serif;
    font-size: 1.58rem;
    line-height: 1.2;
    margin: 2.5rem 0 0.35rem;
    position: relative;
    letter-spacing: -0.01em;
  }

  /* ----------- Summary Box ------------- */
  .article-summary-box {
    background: ${({ theme }) => theme.colors.bgAlt};
    border-left: 5px solid ${({ theme }) => theme.colors.accent};
    border-radius: 12px;
    padding: 20px 24px;
    margin: 26px 0 38px;
    font-size: 0.96rem;
    box-shadow: 0 1px 0 rgba(0, 0, 0, 0.03);
  }

  .article-summary-box strong {
    display: block;
    font-family: "Playfair Display", serif;
    font-size: 1.08rem;
    margin-bottom: 12px;
    letter-spacing: -0.01em;
  }

  .article-summary-box ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .article-summary-box li {
    margin-bottom: 8px;
    line-height: 1.5;
  }

  .article-summary-box li b {
    color: ${({ theme }) => theme.colors.accent};
    font-weight: 700;
    margin-right: 4px;
  }

  /* ----------- Article Breaks ------------- */
  .cw-break {
    position: relative;
    margin: 40px 0 42px;
    padding: 24px 30px;
    border-radius: 18px;
    background: linear-gradient(
      to bottom,
      rgba(255, 255, 255, 0.72),
      rgba(255, 255, 255, 0.92)
    );
    border: 1px solid rgba(0, 0, 0, 0.06);
    box-shadow:
      0 1px 0 rgba(0, 0, 0, 0.02),
      0 10px 24px rgba(0, 0, 0, 0.04);
    overflow: hidden;
  }

  .cw-break::before {
    content: "";
    position: absolute;
    inset: 0 auto 0 0;
    width: 4px;
    background: ${({ theme }) => theme.colors.accent};
    opacity: 0.95;
  }

  .cw-break--quote {
    padding: 32px 34px 30px;
    background:
      linear-gradient(
        to bottom,
        rgba(255, 255, 255, 0.78),
        rgba(255, 255, 255, 0.97)
      ),
      ${({ theme }) => theme.colors.bgAlt || "#f8f8f6"};
  }

  .cw-break--quote::after {
    content: "“";
    position: absolute;
    top: 10px;
    right: 18px;
    font-family: "Playfair Display", serif;
    font-size: 4.5rem;
    line-height: 1;
    opacity: 0.1;
    pointer-events: none;
  }

  .cw-break__quote {
    margin: 0;
    padding: 0;
    font-family: "Playfair Display", serif;
    font-size: 1.52rem;
    line-height: 1.48;
    font-weight: 700;
    font-style: italic;
    letter-spacing: -0.015em;
    max-width: 42ch;
  }

  .cw-break--hero-number {
    text-align: center;
    padding: 32px 24px 30px;
  }

  .cw-break--hero-number::before {
    left: 50%;
    top: 0;
    bottom: auto;
    width: 88px;
    height: 4px;
    transform: translateX(-50%);
    border-radius: 999px;
  }

  .cw-break__hero-value {
    font-family: "Playfair Display", serif;
    font-size: clamp(3rem, 8vw, 5.8rem);
    line-height: 0.9;
    font-weight: 800;
    letter-spacing: -0.04em;
    margin: 0;
    text-wrap: balance;
  }

  .cw-break__hero-label {
    margin-top: 12px;
    font-size: 1.02rem;
    font-weight: 700;
    line-height: 1.35;
    letter-spacing: -0.01em;
  }

  .cw-break__hero-kicker {
    margin-top: 7px;
    font-size: 0.92rem;
    opacity: 0.68;
    line-height: 1.4;
    max-width: 28ch;
    margin-left: auto;
    margin-right: auto;
  }

  .cw-break--timeline {
    padding: 26px 30px 24px;
  }

  .cw-break--timeline .cw-break__inner {
    position: relative;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 22px;
    align-items: start;
  }

  .cw-break--timeline .cw-break__inner::before {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    top: 12px;
    height: 2px;
    background: linear-gradient(
      to right,
      ${({ theme }) => theme.colors.accent},
      rgba(0, 0, 0, 0.14)
    );
    opacity: 0.45;
  }

  .cw-break__timeline-item {
    position: relative;
    padding-top: 26px;
    padding-left: 0;
    display: grid;
    gap: 6px;
  }

  .cw-break__timeline-item::before {
    content: "";
    position: absolute;
    left: 0;
    top: 7px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.accent};
    box-shadow: 0 0 0 5px rgba(0, 0, 0, 0.04);
    z-index: 1;
  }

  .cw-break__timeline-label {
    font-size: 0.76rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.6;
    line-height: 1.15;
  }

  .cw-break__timeline-text {
    font-size: 0.98rem;
    line-height: 1.48;
    max-width: 24ch;
  }

  .cw-break--map-dot {
    text-align: center;
    padding: 28px 22px 26px;
  }

  .cw-break--map-dot::before {
    left: 50%;
    top: 0;
    bottom: auto;
    width: 72px;
    height: 4px;
    transform: translateX(-50%);
    border-radius: 999px;
  }

  .cw-break__map-dot-marker {
    font-size: 2rem;
    line-height: 1;
    margin-bottom: 10px;
    color: ${({ theme }) => theme.colors.accent};
    text-shadow: 0 0 20px rgba(0, 0, 0, 0.08);
  }

  .cw-break__map-dot-place {
    font-size: 1.03rem;
    font-weight: 800;
    line-height: 1.3;
    letter-spacing: -0.01em;
  }

  .cw-break__map-dot-label {
    margin-top: 5px;
    font-size: 0.92rem;
    opacity: 0.68;
    line-height: 1.4;
    max-width: 28ch;
    margin-left: auto;
    margin-right: auto;
  }

  .cw-break--factbox {
    padding-top: 22px;
    padding-bottom: 22px;
  }

  .cw-break__factbox-head {
    margin-bottom: 14px;
  }

  .cw-break__factbox-title {
    font-family: "Playfair Display", serif;
    font-size: 1.18rem;
    font-weight: 700;
    line-height: 1.25;
    letter-spacing: -0.015em;
  }

  .cw-break__factbox-type {
    margin-top: 3px;
    font-size: 0.76rem;
    opacity: 0.62;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    line-height: 1.2;
  }

  .cw-break__factbox-body {
    display: grid;
    gap: 12px;
  }

  .cw-break__fact-row {
    display: grid;
    gap: 2px;
    padding-top: 10px;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
  }

  .cw-break__fact-row:first-child {
    padding-top: 0;
    border-top: 0;
  }

  .cw-break__fact-label {
    font-size: 0.74rem;
    font-weight: 800;
    opacity: 0.62;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    line-height: 1.15;
  }

  .cw-break__fact-value {
    font-size: 0.99rem;
    line-height: 1.42;
    letter-spacing: -0.005em;
  }

  .cw-inline-image {
    margin: 34px 0 38px;
  }

  .cw-inline-image__wrap {
    width: 100%;
    overflow: hidden;
    border-radius: 14px;
    background: #eaeaea;
    aspect-ratio: 16 / 10;
  }

  .cw-inline-image__img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
    object-position: 50% 30%;
  }

  .cw-inline-image__credit {
    font-size: 0.82rem;
    opacity: 0.75;
    font-style: italic;
    margin-top: 10px;
    line-height: 1.45;
  }

  @media (max-width: 770px) {
    padding: 16px 18px 28px 18px;
    font-size: 1rem;
    line-height: 1.75;

    p {
      margin-bottom: 1.5rem;
    }

    h2 {
      font-size: 1.42rem;
      margin: 2.2rem 0 0.3rem;
    }

    .article-summary-box {
      padding: 17px 18px;
      margin: 22px 0 30px;
    }

    .cw-break {
      margin: 30px 0 32px;
      padding: 18px 18px;
      border-radius: 16px;
    }

    .cw-break--quote {
      padding: 22px 20px;
    }

    .cw-break--quote::after {
      font-size: 3.6rem;
      top: 8px;
      right: 14px;
    }

    .cw-break__quote {
      font-size: 1.22rem;
      max-width: none;
    }

    .cw-break__hero-value {
      font-size: clamp(2.5rem, 14vw, 4.4rem);
    }

    .cw-break__hero-label {
      font-size: 0.98rem;
    }

    .cw-break--timeline {
      padding: 20px 18px 18px;
    }

    .cw-break--timeline .cw-break__inner {
      grid-template-columns: 1fr;
      gap: 18px;
    }

    .cw-break--timeline .cw-break__inner::before {
      left: 4px;
      right: auto;
      top: 6px;
      bottom: 6px;
      width: 2px;
      height: auto;
      background: linear-gradient(
        to bottom,
        ${({ theme }) => theme.colors.accent},
        rgba(0, 0, 0, 0.14)
      );
    }

    .cw-break__timeline-item {
      padding-top: 0;
      padding-left: 24px;
    }

    .cw-break__timeline-item::before {
      left: 0;
      top: 0.45em;
      width: 10px;
      height: 10px;
      box-shadow: 0 0 0 4px rgba(0, 0, 0, 0.04);
    }

    .cw-break__timeline-text {
      max-width: none;
      font-size: 0.98rem;
    }

    .cw-break__fact-value,
    .cw-break__map-dot-place {
      font-size: 0.98rem;
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

  @media (max-width: 900px) {
    padding: 8px 16px 30px 8px;
  }
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
  background: ${({ $portrait, theme }) =>
    $portrait ? "#111" : theme.colors.bgAlt};
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease;

  /* ✅ kortet bestemmer høyden (samme ratio som feed cards) */
  aspect-ratio: 16 / 10;

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

export const RelatedPortraitBackdrop = styled.div`
  position: absolute;
  inset: 0;
  z-index: 0;

  background-image: url("${({ $src }) => $src}");
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;

  transform: scale(1.12);
  filter: blur(18px) saturate(1.05) brightness(0.82);
  opacity: 0.95;
  pointer-events: none;
`;

export const RelatedImage = styled.img`
  /* ✅ fyll hele kortet (kortet har ratioen) */
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;

  object-fit: ${({ $portrait }) => ($portrait ? "contain" : "cover")};
  object-position: ${({ $portrait }) =>
    $portrait ? "center center" : "center 37%"};
  display: block;
`;

export const RelatedImageOverlay = styled.div`
  position: absolute;
  inset: 0;
  z-index: 2;
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

/* ============================================================
   ✅ SEO/NAV HELPERS (anchors that keep exact design)
   Added only — nothing removed.
============================================================ */

/**
 * Use on an element that wraps the Close UI to become a real <a>/<Link>.
 * IMPORTANT: keep pointer-events auto (CloseWrap disables pointer events).
 */
export const CloseLink = styled.a`
  position: absolute;
  right: 14px;
  top: 27px;

  pointer-events: auto;

  border: 0;
  background: #d8d8d8;
  border-radius: 10px;
  padding: 5px 10px;

  cursor: pointer;
  color: inherit;
  text-decoration: none;

  &:hover {
    background: #cccccc;
  }
`;

/**
 * Link styled EXACT like NavButton for Prev/Next anchors.
 */
export const NavLink = styled.a`
  border: 1px solid rgba(0, 0, 0, 0.14);
  background: #fff;
  border-radius: 12px;
  padding: 8px 12px;

  cursor: pointer;
  color: inherit;
  text-decoration: none;

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
`;

/**
 * Non-clickable sibling for disabled Prev/Next, matching :disabled on NavButton.
 */
export const NavDisabled = styled.span`
  border: 1px solid rgba(0, 0, 0, 0.14);
  background: #fff;
  border-radius: 12px;
  padding: 8px 12px;

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

  opacity: 0.45;
  cursor: default;
  transform: none;
`;

/**
 * Wrapper for CategoryBadge so the badge can become a real link without styling changes.
 */
export const CategoryLink = styled.a`
  display: inline-flex;
  align-items: center;

  text-decoration: none;
  color: inherit;
`;

export const VideoWrap = styled.div`
  margin: 0px auto 0px;

  position: relative;
  width: min(100%, 240px);
  aspect-ratio: 9 / 16; /* Shorts format */

  border-radius: 12px;
  overflow: hidden;
  background: #000;

  iframe {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border: 0;
  }
`;

export const VideoMeta = styled.div`
  margin-top: 5px;
  font-size: 0.8rem;
  opacity: 0.7;
  text-align: center;

  a {
    color: ${({ theme }) => theme.colors.accent};
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }
`;

export const QuoteHeroWrap = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  margin-top: 14px;
  overflow: hidden;
  background: ${({ $bg }) => $bg || "#222"};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 28px;
  border-radius: 0;

  &::before {
    content: "“";
    position: absolute;
    top: 18px;
    left: 22px;
    font-family: "Playfair Display", serif;
    font-size: clamp(5rem, 10vw, 8rem);
    line-height: 1;
    color: rgba(255, 255, 255, 0.14);
    pointer-events: none;
  }

  &::after {
    content: "”";
    position: absolute;
    right: 24px;
    bottom: 8px;
    font-family: "Playfair Display", serif;
    font-size: clamp(5rem, 10vw, 8rem);
    line-height: 1;
    color: rgba(255, 255, 255, 0.1);
    pointer-events: none;
  }

  @media (max-width: 770px) {
    min-height: 280px;
    padding: 28px 18px;
  }
`;

export const QuoteHeroInner = styled.div`
  position: relative;
  z-index: 1;
  width: min(760px, 100%);
  text-align: center;
`;

export const QuoteHeroKicker = styled.div`
  margin-bottom: 14px;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.82);
  font-family:
    Inter,
    system-ui,
    -apple-system,
    Segoe UI,
    Roboto,
    Arial,
    sans-serif;
`;

export const QuoteHeroText = styled.blockquote`
  margin: 0;
  color: white;
  font-family: "Playfair Display", serif;
  font-size: clamp(1.35rem, 3.6vw, 3rem);
  line-height: 1.24;
  font-weight: 700;
  letter-spacing: -0.02em;
  text-wrap: balance;
`;

export const QuoteHeroAttribution = styled.div`
  margin-top: 18px;
  color: rgba(255, 255, 255, 0.9);
  font-family: "Playfair Display", serif;
  font-size: 1rem;
  line-height: 1.2;
  text-align: center;
`;
