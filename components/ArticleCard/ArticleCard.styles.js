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
  max-height: 250px;
  Margin: 0 0 50px 0;
  padding: 30px 0;

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
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;

  /* Sikrer jevn høyde i desktop */
  aspect-ratio: 16 / 9;
  max-height: 250px;
  border-radius: 6px;

  @media (max-width: 768px) {
    flex: none;
    width: 100%;
    aspect-ratio: 16 / 9;
    max-height: none;
  }
`;

export const Image = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 50% 35%;
  transition: all 0.6s ease;
  filter: grayscale(100%) brightness(0.9);

  ${Card}:hover & {
    transform: scale(1.05);
    filter: grayscale(0%) brightness(1);
  }
`;

export const Content = styled.div`
  flex: 1;
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
