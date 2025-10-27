// "use client";

// import React, { useState, useEffect } from "react";
// import { usePathname } from "next/navigation";
// import Link from "next/link";
// import { HeaderWrapper, Logo, Nav, NavLink } from "./Header.styles";

// export default function Header() {
//   const pathname = usePathname();
//   const [active, setActive] = useState("/");

//   const categories = [
//     "science",
//     "technology",
//     "space",
//     "nature",
//     "health",
//     "history",
//     "culture",
//     "sports",
//     "products",
//     "world",
//   ];

//   /* === 🔹 1. Hent lagret aktiv lenke ved oppstart === */
//   useEffect(() => {
//     const saved = localStorage.getItem("activeLink");
//     if (saved) setActive(saved);
//   }, []);

//   /* === 🔹 2. Oppdater aktiv lenke ved ruteendring === */
//   useEffect(() => {
//     if (pathname) {
//       setActive(pathname);
//       localStorage.setItem("activeLink", pathname);
//     }
//   }, [pathname]);

//   /* === 🔹 3. Manuell klikk (fallback) === */
//   const handleClick = (path) => {
//     setActive(path);
//     localStorage.setItem("activeLink", path);
//   };

//   return (
//     <HeaderWrapper>
//       <Logo>
//         <Link href="/">CurioWire</Link>
//       </Logo>

//       <Nav>
//         {categories.map((cat) => {
//           const path = `/${cat}`;
//           return (
//             <NavLink
//               key={cat}
//               href={path}
//               onClick={() => handleClick(path)}
//               className={active === path ? "active" : ""}
//             >
//               {cat.charAt(0).toUpperCase() + cat.slice(1)}
//             </NavLink>
//           );
//         })}
//       </Nav>
//     </HeaderWrapper>
//   );
// }

"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  HeaderWrapper,
  Logo,
  Nav,
  NavLink,
  Hamburger,
  MobileMenu,
} from "./Header.styles";

export default function Header() {
  const pathname = usePathname();
  const [active, setActive] = useState("/");
  const [menuOpen, setMenuOpen] = useState(false);

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

  useEffect(() => {
    const saved = localStorage.getItem("activeLink");
    if (saved) setActive(saved);
  }, []);

  useEffect(() => {
    if (pathname) {
      setActive(pathname);
      localStorage.setItem("activeLink", pathname);
      setMenuOpen(false); // lukk meny ved navigering
    }
  }, [pathname]);

  return (
    <HeaderWrapper>
      <Logo>
        <Link href="/">CurioWire</Link>
      </Logo>

      <Hamburger onClick={() => setMenuOpen(!menuOpen)}>
        {menuOpen ? "✕" : "☰"}
      </Hamburger>

      <Nav>
        {categories.map((cat) => {
          const path = `/${cat}`;
          return (
            <NavLink
              key={cat}
              href={path}
              className={active === path ? "active" : ""}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </NavLink>
          );
        })}
      </Nav>

      {/* Mobilmeny */}
      {menuOpen && (
        <MobileMenu>
          {categories.map((cat) => {
            const path = `/${cat}`;
            return (
              <NavLink
                key={cat}
                href={path}
                className={active === path ? "active" : ""}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </NavLink>
            );
          })}
        </MobileMenu>
      )}
    </HeaderWrapper>
  );
}
