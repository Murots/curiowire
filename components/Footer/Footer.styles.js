import styled from "styled-components";

export const FooterWrapper = styled.footer`
  background: ${({ theme }) => theme.colors.card};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: ${({ theme }) => theme.shadow};
  padding: 2rem;
  text-align: center;
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.9rem;
  margin-top: auto;
`;
