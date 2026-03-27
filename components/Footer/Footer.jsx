"use client";

import React from "react";
import Link from "next/link";
import {
  FooterWrapper,
  Copy,
  Links,
  CategoryLinks,
  SocialLinks,
  SocialRow,
  FooterMark,
} from "./Footer.styles";

const CATEGORIES = [
  "science",
  "technology",
  "space",
  "nature",
  "health",
  "history",
  "culture",
  "sports",
  "products",
  "world",
  "crime",
  "mystery",
];

export default function Footer() {
  return (
    <FooterWrapper>
      <FooterMark src="/Styling.svg" alt="" aria-hidden="true" />
      <Copy>
        © {new Date().getFullYear()} CurioWire — From the digital wire.
      </Copy>

      {/* 🔗 Social icons */}
      <SocialRow>
        <SocialLinks aria-label="CurioWire social links">
          <a
            href="https://www.youtube.com/@CurioWire"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="CurioWire YouTube"
          >
            {/* YouTube */}
            <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
              <path d="M23.5 6.2s-.2-1.7-.9-2.5c-.9-1-1.9-1-2.4-1.1C16.7 2.3 12 2.3 12 2.3h0s-4.7 0-8.2.3c-.5.1-1.5.1-2.4 1.1C.7 4.5.5 6.2.5 6.2S.3 8.2.3 10.2v1.6c0 2 .2 4 .2 4s.2 1.7.9 2.5c.9 1 2.1 1 2.6 1.1 1.9.2 8 .3 8 .3s4.7 0 8.2-.3c.5-.1 1.5-.1 2.4-1.1.7-.8.9-2.5.9-2.5s.2-2 .2-4v-1.6c0-2-.2-4-.2-4zM9.6 14.6V7.8l6.4 3.4-6.4 3.4z" />
            </svg>
          </a>

          <a
            href="https://x.com/CurioWire"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="CurioWire on X"
          >
            {/* X */}
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M18.2 2H21l-6.5 7.4L22.5 22h-6.9l-5.4-7-6.1 7H1.2l7-8L.5 2h7l4.9 6.4L18.2 2zm-2.4 18h2.1L8.1 4H5.8l10 16z" />
            </svg>
          </a>

          <a
            href="https://pinterest.com/CurioWire/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="CurioWire Pinterest"
          >
            {/* Pinterest */}
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M12 2C6.5 2 2 6.2 2 11.4c0 3.3 1.8 6.2 4.5 7.4-.1-.6-.2-1.6 0-2.3.2-.7 1.3-4.4 1.3-4.4s-.3-.6-.3-1.6c0-1.5.9-2.6 2-2.6.9 0 1.3.7 1.3 1.5 0 .9-.6 2.3-.9 3.6-.3 1.1.6 2 1.7 2 2 0 3.5-2.1 3.5-5.1 0-2.7-1.9-4.6-4.7-4.6-3.2 0-5.1 2.4-5.1 4.9 0 1 .4 2 1 2.5.1.1.1.3.1.4-.1.4-.3 1.1-.3 1.3 0 .2-.2.3-.4.2-1.6-.7-2.7-2.9-2.7-4.7 0-3.8 2.8-7.3 8-7.3 4.2 0 7.5 3 7.5 7.1 0 4.2-2.6 7.6-6.3 7.6-1.2 0-2.3-.6-2.7-1.3l-.8 3c-.3 1.2-1.1 2.6-1.6 3.4 1.2.4 2.5.6 3.8.6 5.5 0 10-4.2 10-9.4C22 6.2 17.5 2 12 2z" />
            </svg>
          </a>
        </SocialLinks>
      </SocialRow>

      {/* ✅ Diskrete, crawlbare kategorilenker */}
      <CategoryLinks aria-label="Explore categories">
        <span>Explore:</span>
        {CATEGORIES.map((c, i) => (
          <React.Fragment key={c}>
            <Link href={`/${c}`}>{c}</Link>
            {i < CATEGORIES.length - 1 ? <span>·</span> : null}
          </React.Fragment>
        ))}
      </CategoryLinks>

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
