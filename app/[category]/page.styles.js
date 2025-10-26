import styled from "styled-components";

export const Wrapper = styled.div`
  max-width: 1200px;
  background: var(--color-bg);
  color: var(--color-text);
`;

export const Title = styled.h1`
  text-align: center;
  margin-bottom: 0px;
  color: var(--color-text);
  border-bottom: 3px solid var(--color-accent);
  display: inline-block;
  text-transform: uppercase;
`;

export const Grid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0; /* vi bruker border-bottom på kortene i stedet */
`;

export const Loader = styled.p`
  text-align: center;
  margin-top: 150px;
  color: var(--color-muted);
`;

export const SubIntro = styled.p`
  color: var(--color-muted);
  font-style: italic;
  font-size: 1.1rem;
  margin-bottom: 60px;

  /* første tegn (emoji) skal ikke være kursiv */
  &::first-letter {
    font-style: normal;
  }
`;
