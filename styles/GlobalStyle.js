import { createGlobalStyle } from "styled-components";

export const GlobalStyle = createGlobalStyle`
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html, body {
    background-color: ${({ theme }) => theme.colors.bg};
    color: ${({ theme }) => theme.colors.text};
    font-family: ${({ theme }) => theme.fonts.body};
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }

  a {
    color: ${({ theme }) => theme.colors.link};
    text-decoration: none;
  }

  // a:hover {
  //   text-decoration: underline;
  // }

  h1, h2, h3 {
    font-family: ${({ theme }) => theme.fonts.heading};
    font-weight: 700;
    margin-bottom: 0.5rem;
    letter-spacing: 0.02em;
    text-transform: none;
  }

  h1 {
    font-family: "Playfair Display", "Poppins", serif;
    font-size: 2rem;

    @media (max-width: 450px) {
    font-size: 1.7rem;
  }
  }

  h2 {
    font-family: "Playfair Display", "Poppins", serif;
    font-size: 1.5rem;
  }

  h3 {
    font-family: "Playfair Display", "Poppins", serif;
    font-size: 2rem;
  }

  p {
    font-family: "Inter", sans-serif;
    font-size: 1.1rem;
    line-height: 1.75;
    // max-width: 680px;
    margin: 0 auto;
  }

  main {
    padding: 4rem 15% 6rem 15%;
    max-width: 1200px;
    margin: 0 auto;
  
    @media (max-width: 450px) {
    padding: 4rem 5% 2rem 5%;
  }
  }
`;
