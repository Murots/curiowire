import styled from "styled-components";

export const Wrapper = styled.div`
  max-width: 750px;
  margin: 80px auto;
  padding: 0 24px 60px;
  background: var(--color-bg);
  color: var(--color-text);
  font-family: "Inter", sans-serif;
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
  font-family: "Playfair Display", serif;
  font-size: 1.6rem;
  color: var(--color-accent);
  margin-bottom: 4px;
`;

export const SubIntro = styled.p`
  font-family: "Inter", sans-serif;
  color: var(--color-muted);
  font-style: italic;
  font-size: 1rem;
  margin-bottom: 14px;
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
  object-position: center;
  border-radius: 8px;
  margin: 24px 0 28px;
  display: block;
`;

// export const Excerpt = styled.p`
//   font-size: 1.1rem;
//   margin-bottom: 30px;
// `;

export const Excerpt = styled.div`
  font-size: 1.1rem;
  color: var(--color-text);
  line-height: 1.7;

  p {
    margin-bottom: 1.5rem;
  }

  margin-bottom: 30px;
`;

export const SourceLink = styled.a`
  display: inline-block;
  color: var(--color-link);
  font-weight: 600;
  text-decoration: none;
  margin-bottom: 40px;

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
`;

export const NextLink = styled.a`
  color: var(--color-link);
  text-decoration: none;
  font-weight: 600;

  &:hover {
    text-decoration: underline;
  }
`;
