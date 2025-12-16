import styled, { css } from "styled-components";

// ===============================================================
// CATEGORY BADGE COLORS
// ===============================================================
const categoryColors = {
  science: "#0077ff",
  space: "#8d3bff",
  history: "#b07e3d",
  nature: "#1c9a4c",
  world: "#d9352c",
  technology: "#6c72ff",
  culture: "#ff6b3d",
  products: "#444",
};

export const Card = styled.div`
  display: flex;
  flex-direction: ${({ $reverse }) => ($reverse ? "row-reverse" : "row")};
  gap: 50px;
  align-items: stretch;
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-muted);
  overflow: hidden;
  cursor: pointer;
  min-height: 180px;
  margin: 0 0 40px 0;
  padding: 32px 0;
  transition: transform 0.35s ease, box-shadow 0.35s ease;

  &:hover {
    transform: scale(1.015);
    // box-shadow: 0 10px 28px rgba(0, 0, 0, 0.13);
  }

  @media (max-width: 770px) {
    flex-direction: column;
    gap: 0;
    padding: 0;
    margin-bottom: 30px;
  }
`;

export const ImageWrapper = styled.div`
  flex: 0 0 48%;
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  background-color: #eaeaea;

  aspect-ratio: 16 / 9;
  max-height: 300px;

  /* Overlay for hover effect */
  &::after {
    content: "";
    position: absolute;
    inset: 0;
    background: transparent;
    transition: background 0.35s ease;
  }

  ${Card}:hover &::after {
    background: linear-gradient(to top, rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0));
  }

  @media (max-width: 770px) {
    width: 100%;
    border-radius: 0;
    max-height: 240px;
  }
`;

export const Image = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  border-radius: 6px;
  display: block;
  transition: transform 0.6s ease, filter 0.4s ease;

  ${Card}:hover & {
    transform: scale(1.05);
    filter: brightness(1.1);
  }

  @media (max-width: 770px) {
    border-radius: 0;
  }
`;

export const Content = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  color: var(--color-text);
  padding-right: 10px;

  @media (max-width: 770px) {
    padding: 18px 0 26px 0;
  }
`;

// ===============================================================
// CATEGORY BADGE
// ===============================================================
export const Meta = styled.div`
  font-family: "Inter", sans-serif;
  font-size: 0.78rem;
  color: var(--color-muted);
  margin-bottom: 6px;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 8px;
  text-transform: uppercase;
`;

export const CategoryBadge = styled.span`
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  color: white;

  ${({ $category }) => {
    const color = categoryColors[$category] || "#666";
    return css`
      background: ${color};
    `;
  }}
`;

// ===============================================================
// TITLE
// ===============================================================
export const Title = styled.h2`
  color: var(--color-text);
  margin: 0px;
  line-height: 1.25;
  transition: color 0.25s ease;
  font-size: 1.35rem;
  font-weight: 700;

  ${Card}:hover & {
    color: var(--color-accent);
  }

  @media (max-width: 770px) {
    font-size: 1.2rem;
  }
`;

// ===============================================================
// SUMMARY HOOK (WHAT)
// ===============================================================
export const SummaryWhat = styled.p`
  font-size: 0.9rem;
  color: #444;
  margin: 14px 0 20px;
  font-weight: 400;
  line-height: 1.45;
  max-width: 90%;
  font-style: italic;

  @media (max-width: 770px) {
    font-size: 0.85rem;
    margin: 10px 0 16px;
  }
`;

// ===============================================================
// READ MORE
// ===============================================================
export const ReadMore = styled.span`
  font-family: "Inter", sans-serif;
  font-weight: 400;
  color: var(--color-muted);
  font-size: 0.75rem;
  margin-top: auto;
  text-decoration: underline;
  text-underline-offset: 3px;
  transition: color 0.2s ease, transform 0.25s ease;

  ${Card}:hover & {
    color: var(--color-accent);
    transform: translateX(3px);
  }
`;
