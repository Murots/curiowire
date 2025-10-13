"use client";
import { FooterWrapper } from "./Footer.styles";

export default function Footer() {
  return (
    <FooterWrapper>
      <p>© {new Date().getFullYear()} CurioWire — Extra! Extra!</p>
    </FooterWrapper>
  );
}
