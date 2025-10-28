import { Wrapper, Headline, Paragraph, Highlight } from "./about.styles";

export const metadata = {
  title: "About CurioWire",
  description:
    "CurioWire is a digital newspaper blending AI journalism and vintage editorial design — rediscovering the world’s curiosities, one story at a time.",
};

export default function AboutPage() {
  return (
    <Wrapper>
      <Headline>About CurioWire</Headline>

      <Paragraph>
        <Highlight>CurioWire</Highlight> is a digital newspaper built on
        automation, design and curiosity. Inspired by early twentieth-century
        editorial craft, it reimagines how stories are found, written and shared
        — blending algorithmic precision with the tone of classic print.
      </Paragraph>

      <Paragraph>
        Founded in <strong>2025</strong>, CurioWire began as an experiment in
        automated journalism. The idea was simple: could artificial intelligence
        rediscover the forgotten wonders of science, history and culture — and
        tell them as if reported from a bustling newsroom a century ago?
      </Paragraph>

      <Paragraph>
        Each story is collected from public data archives, re-written with
        editorial balance, and presented with a deliberate visual calm. The
        goal: to celebrate knowledge, invention and the timeless art of human
        curiosity.
      </Paragraph>

      <Paragraph>
        Every headline published by CurioWire seeks the same thing — that small
        spark of wonder that once made people stop, read, and say:
        <em> “Now that’s curious.”</em>
      </Paragraph>
    </Wrapper>
  );
}
