"use client";

import { Wrapper, Headline, Paragraph, MailLink } from "./contact.styles";

export default function ContactContent() {
  return (
    <Wrapper>
      <Headline>Contact the Editorial Desk</Headline>

      <Paragraph>
        <strong>CurioWire</strong> is an independent, AI-assisted editorial
        experiment — blending automation, design and curiosity. While much of
        our content is generated autonomously, we still welcome human contact,
        ideas, and perspectives.
      </Paragraph>

      <Paragraph>
        For story suggestions, factual corrections, or general inquiries, please
        contact us directly at:
      </Paragraph>

      <MailLink href="mailto:editor@curiowire.com">
        editor@curiowire.com
      </MailLink>

      <Paragraph>
        We aim to respond to relevant inquiries within a few business days.
        Automated or promotional submissions will be filtered.
      </Paragraph>
    </Wrapper>
  );
}
