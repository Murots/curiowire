import styled from "styled-components";

export const Wrapper = styled.div`
  // max-width: 1000px;
  padding: 0 auto 60px auto;
  color: ${({ theme }) => theme.colors.bg};
  color: var(--color-text);
  line-height: 1.6;
`;

export const CategoryTag = styled.div`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.accent};
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 4px;
  font-weight: 700;
`;

export const Divider = styled.div`
  width: 80px;
  height: 3px;
  color: ${({ theme }) => theme.colors.accent};
  margin: 12px 0 24px;
`;

export const Headline = styled.div`
  font-family: "Playfair Display", serif;
  font-size: 1.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 0.3rem;
  color: ${({ theme }) => theme.colors.special};
`;

export const SubIntro = styled.p`
  color: ${({ theme }) => theme.colors.text};
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
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.3;
`;

export const Image = styled.img`
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  object-position: 50% 30%;
  border-radius: 8px;
  margin: 24px 0 0 0;
  display: block;
  background-color: #eaeaea;

  /* Fjern fast min-height, og bruk maksgrense i stedet */
  max-height: min(80vh, 600px);
`;

export const Excerpt = styled.div`
  font-size: 1.1rem;
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.7;

  p {
    margin-bottom: 1.5rem;
  }
`;

export const SourceLink = styled.a`
  display: inline-block;
  color: ${({ theme }) => theme.colors.accent};
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
