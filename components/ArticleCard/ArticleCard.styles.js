import styled from "styled-components";

export const Card = styled.div`
  background: var(--color-bg);
  border: 1px solid var(--color-muted);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  transition: all 0.25s ease;
  cursor: pointer;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 6px 14px rgba(0, 0, 0, 0.1);
  }
`;

export const ImageWrapper = styled.div`
  width: 100%;
  height: 180px;
  overflow: hidden;
`;

export const Image = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;

  ${Card}:hover & {
    transform: scale(1.05);
  }
`;

export const Content = styled.div`
  padding: 18px 20px 24px;
`;

export const Category = styled.div`
  font-size: 0.8rem;
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 6px;
`;

export const Headline = styled.div`
  font-family: "Playfair Display", serif;
  font-size: 1.1rem;
  color: var(--color-accent);
  margin-bottom: 2px;
`;

export const SubIntro = styled.p`
  font-family: "Inter", sans-serif;
  color: var(--color-muted);
  font-style: italic;
  font-size: 0.9rem;
  margin-bottom: 8px;
`;

export const Title = styled.h2`
  font-family: "Playfair Display", serif;
  font-size: 1.3rem;
  color: var(--color-text);
  margin-bottom: 8px;
`;

export const Excerpt = styled.p`
  font-family: "Inter", sans-serif;
  color: var(--color-text);
  font-size: 0.95rem;
  line-height: 1.5;
  margin-bottom: 12px;
`;

export const ReadMore = styled.span`
  font-weight: 600;
  color: var(--color-link);
  font-size: 0.95rem;
`;
