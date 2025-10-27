import styled from "styled-components";

export const Wrapper = styled.div`
  max-width: 100%;
  background: var(--color-bg);
  color: var(--color-text);
`;

export const Headline = styled.h1`
  text-align: center;
  margin-bottom: 50px;
  color: var(--color-text);
  border-bottom: 3px solid var(--color-accent);
  display: inline-block;
  padding-bottom: 6px;
  text-transform: uppercase;

  @media (max-width: 768px) {
    // font-size: 1.8rem;
    text-align: left;
  }
`;

export const Grid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0; /* vi bruker border-bottom i ArticleCard */
`;

export const Loader = styled.p`
  text-align: center;
  margin-top: 150px;
  color: var(--color-muted);
`;
