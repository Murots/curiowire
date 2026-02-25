"use client";

import React from "react";
import Link from "next/link";
import { FooterWrapper, Copy, Links, CategoryLinks } from "./Footer.styles";

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
      <Copy>
        © {new Date().getFullYear()} CurioWire — From the digital wire.
      </Copy>

      {/* ✅ Diskrete, crawlbare kategorilenker (SEO + sitelinks-sjanse) */}
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
        {/* 📰 RSS-lenke – for abonnenter og aggregatorer */}
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
