import styled from "styled-components";

export const Wrapper = styled.div`
  max-width: 1000px;
  padding: 0 auto 60px auto;
  background: var(--color-bg);
  color: var(--color-text);
  line-height: 1.6;
`;

export const CategoryTag = styled.div`
  font-size: 0.9rem;
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 4px;
  font-weight: 700;
`;

export const Divider = styled.div`
  width: 80px;
  height: 3px;
  background: var(--color-accent);
  margin: 12px 0 24px;
`;

export const Headline = styled.h2`
  color: var(--color-accent);
  margin-bottom: 0px;
  text-transform: uppercase;
`;

export const SubIntro = styled.p`
  color: var(--color-muted);
  font-style: italic;
  margin-bottom: 14px;

  /* første tegn (emoji) skal ikke være kursiv */
  &::first-letter {
    font-style: normal;
  }
`;

export const Title = styled.h1`
  font-family: "Playfair Display", serif;
  font-size: 2.2rem;
  margin-bottom: 20px;
  color: var(--color-text);
  line-height: 1.3;
`;

export const Image = styled.img`
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  object-position: 50% 35%;
  border-radius: 8px;
  margin: 24px 0 0 0;
  display: block;
`;

export const Excerpt = styled.div`
  font-size: 1.1rem;
  color: var(--color-text);
  line-height: 1.7;

  p {
    margin-bottom: 1.5rem;
  }
`;

export const SourceLink = styled.a`
  display: inline-block;
  color: var(--color-link);
  font-weight: 600;
  text-decoration: none;
  // margin-bottom: 60px;

  &:hover {
    text-decoration: underline;
  }
`;

export const BackButton = styled.button`
  background: none;
  border: none;
  color: var(--color-muted);
  cursor: pointer;
  font-size: 0.95rem;

  &:hover {
    color: var(--color-link);
  }

  margin-top: 60px;
`;

export const NextLink = styled.a`
  color: var(--color-link);
  text-decoration: none;
  font-weight: 600;

  &:hover {
    text-decoration: underline;
  }

  margin-top: 60px;
`;
