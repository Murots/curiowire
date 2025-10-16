import styled from "styled-components";

export const Wrapper = styled.div`
  max-width: 1300px;
  margin: 80px auto;
  padding: 0 40px 100px;
  background: var(--color-bg);
  color: var(--color-text);
`;

export const Headline = styled.h1`
  font-family: "Playfair Display", serif;
  font-size: 2.4rem;
  text-align: center;
  margin-bottom: 50px;
  color: var(--color-text);
  border-bottom: 3px solid var(--color-accent);
  display: inline-block;
  padding-bottom: 6px;

  @media (max-width: 768px) {
    font-size: 1.8rem;
  }
`;

export const Grid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0; /* vi bruker border-bottom i ArticleCard */
`;

export const Loader = styled.p`
  font-family: "Inter", sans-serif;
  text-align: center;
  margin-top: 150px;
  color: var(--color-muted);
`;
