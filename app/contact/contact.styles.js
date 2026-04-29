export const dynamic = "force-static";

import styled from "styled-components";

export const MainWrapper = styled.div`
  padding: 3rem 15% 6rem 15%;
  max-width: 1600px;
  margin: 0 auto;

  @media (max-width: 770px) {
    padding: 4rem 5% 4rem 5%;
  }
`;

export const BreadcrumbSlot = styled.div`
  width: 100%;
  background-color: ${({ theme }) => theme.colors.muted};
`;

export const Wrapper = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  background: ${({ theme }) => theme.colors.bg};
  color: ${({ theme }) => theme.colors.text};
`;

export const Headline = styled.h1`
  font-family: ${({ theme }) => theme.fonts.heading};
  text-align: center;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 40px;
  text-transform: uppercase;
`;

export const Paragraph = styled.p`
  font-family: ${({ theme }) => theme.fonts.body};
  margin-bottom: 20px;
  line-height: 1.7;
  color: ${({ theme }) => theme.colors.text};
`;

export const MailLink = styled.a`
  display: block;
  text-align: center;
  margin: 40px 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.accent};
  text-decoration: none;
  transition: all 0.3s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.text};
    text-decoration: underline;
  }
`;
