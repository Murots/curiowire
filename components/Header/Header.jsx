"use client";

import React from "react";
import Link from "next/link";
import { HeaderWrapper, Logo, Nav, NavItem } from "./Header.styles";

export default function Header() {
  const categories = [
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
  ];

  return (
    <HeaderWrapper>
      <Logo>
        <Link href="/">CurioWire</Link>
      </Logo>

      <Nav>
        {categories.map((cat) => (
          <NavItem key={cat}>
            <Link href={`/${cat}`}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </Link>
          </NavItem>
        ))}
      </Nav>
    </HeaderWrapper>
  );
}
