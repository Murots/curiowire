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
        <Link href="/contact">Contact</Link>
        <span>·</span>
        <Link href="/disclaimer">Disclaimer</Link>
        <span>·</span>
        <Link href="/privacy">Privacy</Link>
        <span>·</span>
        <Link href="/sitemap">Sitemap</Link>
        <span>·</span>
        {/* 📰 Ny RSS-lenke – for abonnenter og aggregatorer */}
        <a
          href="/api/rss"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="CurioWire RSS Feed"
        >
          RSS
        </a>
        <span>·</span>
        <a
          href="https://openai.com"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Visit OpenAI"
        >
          Powered by AI
        </a>
      </Links>
    </FooterWrapper>
  );
}
