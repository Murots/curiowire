import styled, { css } from "styled-components";

// ===============================================================
// CATEGORY BADGE COLORS (IDENTICAL TO ARTICLE CARD)
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

/* ---------------------------------------------
   GLOBAL WRAPPER — smooth viral fade-in
---------------------------------------------- */
export const Wrapper = styled.div`
  animation: fadeIn 0.6s ease both;

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  padding: 0 auto 60px auto;
  color: var(--color-text);
  line-height: 1.7;
`;

/* ---------------------------------------------
   CATEGORY BADGE — Bold, viral, brandable
---------------------------------------------- */
export const CategoryBadge = styled.span`
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  color: white;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  line-height: 1;

  ${({ $category }) => {
    const color = categoryColors[$category] || "#666";
    return css`
      background: ${color};
    `;
  }}
`;

/* ---------------------------------------------
   DIVIDER — slim, premium, magazine style
---------------------------------------------- */
export const Divider = styled.div`
  width: 90px;
  height: 3px;
  background: ${({ theme }) => theme.colors.accent};
  border-radius: 3px;
  margin: 6px 0 28px;
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
  color: ${({ theme }) => theme.colors.special};
`;

/* ---------------------------------------------
   SUBINTRO (emoji headline)
---------------------------------------------- */
export const SubIntro = styled.p`
  color: ${({ theme }) => theme.colors.text};
  font-style: italic;

  &::first-letter {
    font-style: normal;
  }
`;

/* ---------------------------------------------
   MAIN TITLE — more dramatic
---------------------------------------------- */
export const Title = styled.h1`
  font-family: "Playfair Display", serif;
  font-size: 2.4rem;
  font-weight: 700;
  margin-bottom: 12px;
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.28;

  @media (max-width: 700px) {
    font-size: 2rem;
  }
`;

/* ---------------------------------------------
   PUBLISHED + CATEGORY BADGE
---------------------------------------------- */
export const Published = styled.p`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.muted};
  margin-bottom: 0px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

/* ---------------------------------------------
   IMAGE — soft parallax + depth
---------------------------------------------- */
export const Image = styled.img`
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  object-position: 50% 30%;
  border-radius: 10px;
  margin: 26px 0 0 0;
  background-color: #eaeaea;
  max-height: min(80vh, 650px);
`;

/* ---------------------------------------------
   ARTICLE BODY — improved reading rhythm
---------------------------------------------- */
export const Excerpt = styled.div`
  font-size: 1.1rem;
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.78;
  margin-top: 24px;

  p {
    margin-bottom: 1.7rem;
  }

  h2 {
    font-family: "Playfair Display", serif;
    font-size: 1.5rem;
    margin: 2.4rem 0 1rem;
    position: relative;
    padding-bottom: 6px;
  }

  h2::after {
    content: "";
    position: absolute;
    left: 0;
    bottom: 0;
    width: 60px;
    height: 3px;
    background: ${({ theme }) => theme.colors.accent};
    opacity: 0.7;
    border-radius: 3px;
  }

  /* ----------- Summary Box ------------- */
  .article-summary-box {
    background: ${({ theme }) => theme.colors.bgAlt};
    border-left: 5px solid ${({ theme }) => theme.colors.accent};
    border-radius: 10px;
    padding: 20px 24px;
    margin: 34px 0 42px;
    font-size: 0.9rem;
    // box-shadow: 0 3px 12px rgba(0, 0, 0, 0.08);

    strong {
      display: block;
      font-family: "Playfair Display", serif;
      font-size: 1.1rem;
      margin-bottom: 12px;
    }

    ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    li {
      margin-bottom: 8px;
      color: ${({ theme }) => theme.colors.text};
      line-height: 1.5;
    }

    li b {
      color: ${({ theme }) => theme.colors.accent};
      font-weight: 600;
      margin-right: 4px;
    }
  }
`;

/* ---------------------------------------------
   PRODUCT LINK
---------------------------------------------- */
export const SourceLink = styled.a`
  display: inline-block;
  color: ${({ theme }) => theme.colors.accent};
  font-weight: 600;
  margin-top: 30px;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

/* ---------------------------------------------
   NAV BUTTONS
---------------------------------------------- */
export const BackButton = styled.button`
  background: none;
  border: none;
  color: var(--color-muted);
  cursor: pointer;
  font-size: 0.95rem;
  margin-top: 60px;

  &:hover {
    color: var(--color-link);
  }
`;

export const NextLink = styled.a`
  color: var(--color-link);
  font-weight: 600;
  text-decoration: none;
  margin-top: 60px;

  &:hover {
    text-decoration: underline;
  }
`;
