import styled from "styled-components";

export const Card = styled.div`
  display: flex;
  flex-direction: ${({ $reverse }) => ($reverse ? "row-reverse" : "row")};
  gap: 50px;
  align-items: stretch;
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-muted);
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: pointer;
  min-height: 150px;
  margin: 0 0 40px 0;
  padding: 30px 0;

  &:hover {
    transform: translateY(-3px);
  }

  @media (max-width: 770px) {
    flex-direction: column;
    gap: 0;
    padding: 0;
    margin-bottom: 30px;
    border-radius: 8px;
    overflow: hidden;
  }
`;

// export const ImageWrapper = styled.div`
//   flex: 0 0 45%;
//   position: relative;
//   display: flex;
//   align-items: center;
//   justify-content: center;
//   aspect-ratio: 16 / 9;
//   max-height: 250px;
//   border-radius: 6px;
//   overflow: hidden;

//   @media (max-width: 770px) {
//     flex: none;
//     width: 100%;
//     max-height: none;
//     border-radius: 0;
//   }
// `;

// export const Image = styled.img`
//   width: 100%;
//   height: 100%;
//   object-fit: cover;
//   object-position: 50% 30%;
//   transition: all 0.6s ease;
//   filter: grayscale(100%) brightness(0.9);

//   ${Card}:hover & {
//     transform: scale(1.05);
//     filter: grayscale(0%) brightness(1);
//   }
// `;

export const ImageWrapper = styled.div`
  flex: 0 0 45%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  overflow: hidden;
  background-color: #eaeaea;

  @media (max-width: 770px) {
    flex: none;
    width: 100%;
    border-radius: 0;
  }
`;

export const Image = styled.img`
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  object-position: 50% 30%;
  border-radius: 6px;
  display: block;
  transition: all 0.6s ease;
  filter: grayscale(100%) brightness(0.9);
  background-color: #eaeaea;

  ${Card}:hover & {
    transform: scale(1.05);
    filter: grayscale(0%) brightness(1);
  }

  /* Responsiv høydebegrensning */
  max-height: min(40vh, 300px);

  @media (max-width: 770px) {
    max-height: min(50vh, 250px);
    border-radius: 0;
  }
`;

export const Content = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  color: var(--color-text);

  @media (max-width: 770px) {
    padding: 16px 0px 24px 0px;
  }

  &:hover {
    transform: none;
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
  color: var(--color-text);
  margin-bottom: 10px;
  line-height: 1.35;
  transition: color 0.3s ease, transform 0.2s ease;
  font-size: 1.2rem;

  @media (max-width: 770px) {
    font-size: 1.1rem;
    line-height: 1.4;
  }
`;

export const ReadMore = styled.span`
  font-family: "Inter", sans-serif;
  font-weight: 500;
  color: var(--color-muted);
  font-size: 0.7rem;
  font-weight: 400;
  margin-top: auto;
  transition: color 0.2s ease;
  text-decoration: underline;
  text-underline-offset: 3px;
  text-transform: uppercase;

  ${Card}:hover & {
    color: var(--color-accent);
    font-weight: 600;
  }
`;
