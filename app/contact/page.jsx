import { Wrapper, Headline, Paragraph, MailLink } from "./contact.styles";

export const metadata = {
  title: "Contact — CurioWire",
  description:
    "Reach out to the CurioWire editorial team. Send story tips, feedback or partnership inquiries.",
};

export default function ContactPage() {
  return (
    <Wrapper>
      <Headline>Contact the Editorial Desk</Headline>

      <Paragraph>
        CurioWire is an independent, AI-assisted editorial experiment — blending
        automation, design and curiosity. While much of our content is generated
        autonomously, we still welcome human contact, ideas, and perspectives.
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
