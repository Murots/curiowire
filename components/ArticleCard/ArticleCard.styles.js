// import styled from "styled-components";

// export const Card = styled.div`
//   background: var(--color-bg);
//   border: 1px solid var(--color-muted);
//   border-radius: 10px;
//   overflow: hidden;
//   box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
//   transition: all 0.25s ease;
//   cursor: pointer;

//   &:hover {
//     transform: translateY(-4px);
//     box-shadow: 0 6px 14px rgba(0, 0, 0, 0.1);
//   }
// `;

// export const ImageWrapper = styled.div`
//   width: 100%;
//   height: 180px;
//   overflow: hidden;
// `;

// export const Image = styled.img`
//   width: 100%;
//   height: 100%;
//   object-fit: cover;
//   transition: transform 0.4s ease;

//   ${Card}:hover & {
//     transform: scale(1.05);
//   }
// `;

// export const Content = styled.div`
//   padding: 18px 20px 24px;
// `;

// export const Category = styled.div`
//   font-size: 0.8rem;
//   color: var(--color-accent);
//   text-transform: uppercase;
//   letter-spacing: 0.8px;
//   margin-bottom: 6px;
// `;

// export const Headline = styled.div`
//   font-family: "Playfair Display", serif;
//   font-size: 1.1rem;
//   color: var(--color-accent);
//   margin-bottom: 2px;
// `;

// export const SubIntro = styled.p`
//   font-family: "Inter", sans-serif;
//   color: var(--color-muted);
//   font-style: italic;
//   font-size: 0.9rem;
//   margin-bottom: 8px;
// `;

// export const Title = styled.h2`
//   font-family: "Playfair Display", serif;
//   font-size: 1.3rem;
//   color: var(--color-text);
//   margin-bottom: 8px;
// `;

// export const Excerpt = styled.p`
//   font-family: "Inter", sans-serif;
//   color: var(--color-text);
//   font-size: 0.95rem;
//   line-height: 1.5;
//   margin-bottom: 12px;
// `;

// export const ReadMore = styled.span`
//   font-weight: 600;
//   color: var(--color-link);
//   font-size: 0.95rem;
// `;

import styled from "styled-components";

export const Card = styled.div`
  display: flex;
  flex-direction: ${({ $reverse }) => ($reverse ? "row-reverse" : "row")};
  align-items: stretch;
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-muted);
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: pointer;
  min-height: 150px;
  max-height: 250px;
  Margin: 20px 0;

  &:hover {
    background: var(--bg-color););
    transform: translateY(-3px);
  }

  @media (max-width: 768px) {
    flex-direction: column;
    height: auto;
  }
`;

export const ImageWrapper = styled.div`
  flex: 0 0 45%;
  overflow: hidden;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;

  @media (max-width: 768px) {
    flex: none;
    width: 100%;
    height: 200px;
  }
`;

export const Image = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: grayscale(100%) brightness(0.9);
  transition: all 0.6s ease;
  padding: 30px;

  ${Card}:hover & {
    transform: scale(1.05);
    filter: grayscale(0%) brightness(1);
  }
`;

export const Content = styled.div`
  flex: 1;
  padding: 28px 36px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  color: var(--color-text);

  @media (max-width: 768px) {
    padding: 20px;
  }
`;

export const Meta = styled.div`
  font-family: "Inter", sans-serif;
  font-size: 0.85rem;
  color: var(--color-muted);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

export const Title = styled.h2`
  font-family: "Playfair Display", serif;
  font-size: 1.4rem;
  color: var(--color-text);
  margin-bottom: 10px;
  line-height: 1.35;
  transition: color 0.3s ease, transform 0.2s ease;

  ${Card}:hover & {
    color: var(--color-text); /* behold svart, ikke blå */
    transform: translateX(4px);
  }
`;

export const ReadMore = styled.span`
  font-family: "Inter", sans-serif;
  font-weight: 500;
  color: var(--color-muted);
  font-size: 0.9rem;
  margin-top: auto;
  transition: color 0.2s ease;

  ${Card}:hover & {
    color: var(--color-accent);
  }
`;
