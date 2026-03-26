"use client";

import {
  Wrapper,
  Headline,
  Paragraph,
  MailLink,
  MainWrapper,
  BreadcrumbSlot,
} from "./contact.styles";
import Breadcrumbs from "@/components/Breadcrumbs/Breadcrumbs";

export default function ContactContent() {
  const breadcrumbItems = [{ label: "Home", href: "/" }, { label: "Contact" }];

  return (
    <>
      <BreadcrumbSlot>
        <Breadcrumbs items={breadcrumbItems} />
      </BreadcrumbSlot>
      <MainWrapper>
        <Wrapper>
          <Headline>Contact the Editorial Desk</Headline>

          <Paragraph>
            <strong>CurioWire</strong> is an independent, AI-assisted editorial
            experiment — blending automation, design and curiosity. While much
            of our content is generated autonomously, we still welcome human
            contact, ideas, and perspectives.
          </Paragraph>

          <Paragraph>
            For story suggestions, factual corrections, or general inquiries,
            please contact us directly at:
          </Paragraph>

          <MailLink href="mailto:editor@curiowire.com">
            editor@curiowire.com
          </MailLink>

          <Paragraph>
            We aim to respond to relevant inquiries within a few business days.
            Automated or promotional submissions will be filtered.
          </Paragraph>
        </Wrapper>
      </MainWrapper>
    </>
  );
}
