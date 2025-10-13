"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HeaderWrapper, Logo, Nav, NavLink } from "./Header.styles";

export default function Header() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "All" },
    { href: "/science", label: "Science" },
    { href: "/history", label: "History" },
    { href: "/astronomy", label: "Astronomy" },
    { href: "/nature", label: "Nature" },
    { href: "/technology", label: "Technology" },
    { href: "/sports", label: "Sports" },
    { href: "/culture", label: "Culture" },
    { href: "/products", label: "Products" },
    { href: "/news", label: "News" },
  ];

  return (
    <HeaderWrapper>
      <Logo>CurioWire</Logo>
      <Nav>
        {links.map(({ href, label }) => (
          <NavLink key={href} href={href} $active={pathname === href}>
            {label}
          </NavLink>
        ))}
      </Nav>
    </HeaderWrapper>
  );
}
