// import styled from "styled-components";

// export const Wrapper = styled.div`
//   max-width: 1200px;
//   background: var(--color-bg);
//   color: var(--color-text);
// `;

// export const Title = styled.h1`
//   text-align: center;
//   margin-bottom: 0px;
//   color: var(--color-text);
//   border-bottom: 3px solid var(--color-accent);
//   display: inline-block;
//   text-transform: uppercase;
// `;

// export const Grid = styled.div`
//   display: flex;
//   flex-direction: column;
//   gap: 0; /* vi bruker border-bottom på kortene i stedet */
// `;

// export const Loader = styled.p`
//   text-align: center;
//   margin-top: 150px;
//   color: var(--color-muted);
// `;

// export const SubIntro = styled.p`
//   color: var(--color-muted);
//   font-style: italic;
//   font-size: 1.1rem;
//   margin-bottom: 60px;

//   /* første tegn (emoji) skal ikke være kursiv */
//   &::first-letter {
//     font-style: normal;
//   }
// `;

// export const LoadMore = styled.button`
//   display: block;
//   margin: 40px auto 80px auto;
//   background: none;
//   border: 1px solid var(--color-accent);
//   color: var(--color-accent);
//   font-family: "Inter", sans-serif;
//   font-size: 1rem;
//   padding: 10px 24px;
//   border-radius: 6px;
//   cursor: pointer;
//   transition: all 0.3s ease;

//   &:hover {
//     background: var(--color-accent);
//     color: var(--color-accent);
//     transform: translateY(-2px);
//   }
// `;

import styled from "styled-components";

export const Wrapper = styled.div`
  max-width: 1200px;
  color: ${({ theme }) => theme.colors.text};
`;

export const Title = styled.h1`
  text-align: center;
  margin-bottom: 0px;
  color: ${({ theme }) => theme.colors.text};
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
  color: ${({ theme }) => theme.colors.muted};
`;

export const SubIntro = styled.p`
  color: ${({ theme }) => theme.colors.muted};
  font-style: italic;
  font-size: 1.1rem;
  margin-bottom: 60px;

  /* første tegn (emoji) skal ikke være kursiv */
  &::first-letter {
    font-style: normal;
  }
`;

export const LoadMore = styled.button`
  display: block;
  margin: 0px auto 0px auto;
  background: none;
  border: 1px solid ${({ theme }) => theme.colors.text};
  color: ${({ theme }) => theme.colors.text};
  font-family: "Inter", sans-serif;
  font-size: 1rem;
  padding: 10px 24px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;

  &:hover {
    color: ${({ theme }) => theme.colors.accent};
    transform: translateY(-2px);
  }
`;
