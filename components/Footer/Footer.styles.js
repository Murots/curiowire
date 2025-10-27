import styled from "styled-components";

export const FooterWrapper = styled.footer`
  width: 100%;
  background: var(--color-bg);
  border-top: 1px solid var(--color-muted);
  padding: 32px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  // font-family: "Inter", sans-serif;
  // font-size: 0.95rem;
  color: var(--color-muted);
  text-align: center;
  font-family: "IBM Plex Mono", monospace;
  font-size: 0.85rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
`;

export const Copy = styled.div`
  font-size: 0.9rem;
  color: var(--color-text);
`;

export const Links = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;

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
`;
