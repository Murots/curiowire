import styled from "styled-components";

export const FooterWrapper = styled.footer`
  width: 100%;
  background: ${({ theme }) => theme.colors.accent};
  padding: 32px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: white;
  text-align: center;
  font-family: "IBM Plex Mono", monospace;
  font-size: 0.85rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;

  border-top: solid;
  border-width: 4px;
  border-color: #6b0000;

  @media (max-width: 770px) {
    padding: 28px 16px;
    font-size: 0.8rem;
    gap: 10px;
  }

  @media (max-width: 480px) {
    padding: 24px 12px;
    font-size: 0.75rem;
    line-height: 1.5;
  }
`;

export const Copy = styled.div`
  font-size: 0.9rem;
  color: var(--color-text);

  @media (max-width: 770px) {
    font-size: 0.85rem;
  }

  @media (max-width: 480px) {
    font-size: 0.8rem;
  }
`;

export const Links = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
  max-width: 90%;
  line-height: 1.8;

  a {
    color: var(--color-link);
    text-decoration: none;
    transition: color 0.2s ease;

    &:hover {
      color: var(--color-accent);
      text-decoration: underline;
    }
  }

  span {
    color: var(--color-muted);
    user-select: none;
  }

  /* 📱 Små skjermer: gi mer luft og bedre radbryting */
  @media (max-width: 770px) {
    gap: 10px 14px;
    line-height: 1.8;
  }

  @media (max-width: 480px) {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px 10px;
    line-height: 2;
  }
`;

export const CategoryLinks = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
  max-width: 90%;
  line-height: 1.8;
  font-size: 0.6rem;
  opacity: 0.75;

  span {
    color: var(--color-muted);
    user-select: none;
  }

  a {
    color: var(--color-link);
    text-decoration: none;

    &:hover {
      color: var(--color-accent);
      text-decoration: underline;
    }
  }
`;

export const SocialRow = styled.div`
  width: 100%;
  padding: 12px 0;
  border-top: 1px solid #6b0000;
  border-bottom: 1px solid #6b0000;
`;

export const SocialLinks = styled.div`
  display: flex;
  gap: 28px;
  align-items: center;
  justify-content: center;

  a {
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    opacity: 0.9;
    transition:
      transform 0.2s ease,
      opacity 0.2s ease;
  }

  a:hover {
    opacity: 1;
    transform: translateY(-2px);
  }

  svg {
    display: block;
    width: 28px;
    height: 28px;
  }
`;
