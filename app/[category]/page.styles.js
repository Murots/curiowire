import styled from "styled-components";

export const Wrapper = styled.div`
  max-width: 1300px;
  margin: 80px auto;
  padding: 0 40px 100px;
  background: var(--color-bg);
  color: var(--color-text);
`;

export const Title = styled.h1`
  font-family: "Playfair Display", serif;
  font-size: 2.2rem;
  text-align: center;
  margin-bottom: 50px;
  color: var(--color-text);
  border-bottom: 3px solid var(--color-accent);
  display: inline-block;
  padding-bottom: 6px;
`;

export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 30px;
`;

export const Loader = styled.p`
  font-family: "Inter", sans-serif;
  text-align: center;
  margin-top: 150px;
  color: var(--color-muted);
`;
