"use client";

import React from "react";
import Link from "next/link";
import { FooterWrapper, Copy, Links } from "./Footer.styles";

export default function Footer() {
  return (
    <FooterWrapper>
      <Copy>
        © {new Date().getFullYear()} CurioWire — From the digital wire.
      </Copy>
      <Links>
        <Link href="/about">About</Link>
        <span>·</span>
        <Link href="/sources">Sources</Link>
        <span>·</span>
        <a href="https://openai.com" target="_blank" rel="noopener noreferrer">
          Powered by AI
        </a>
      </Links>
    </FooterWrapper>
  );
}
