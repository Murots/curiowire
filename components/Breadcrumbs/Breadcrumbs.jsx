// components/Breadcrumbs/Breadcrumbs.jsx
"use client";

import React from "react";
import {
  Nav,
  List,
  Item,
  CrumbLink,
  Current,
  Separator,
} from "./Breadcrumbs.styles";

function normalizeItems(items) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const label = String(item.label || "").trim();
      const href =
        typeof item.href === "string" && item.href.trim()
          ? item.href.trim()
          : null;

      if (!label) return null;

      return { label, href };
    })
    .filter(Boolean);
}

export default function Breadcrumbs({ items = [], className }) {
  const crumbs = normalizeItems(items);

  if (crumbs.length <= 1) return null;

  return (
    <Nav aria-label="Breadcrumb" className={className}>
      <List>
        {crumbs.map((item, index) => {
          const isLast = index === crumbs.length - 1;

          return (
            <React.Fragment key={`${item.label}-${item.href || index}`}>
              <Item>
                {isLast || !item.href ? (
                  <Current aria-current="page" title={item.label}>
                    {item.label}
                  </Current>
                ) : (
                  <CrumbLink href={item.href}>{item.label}</CrumbLink>
                )}
              </Item>

              {!isLast ? (
                <Item aria-hidden="true">
                  <Separator>/</Separator>
                </Item>
              ) : null}
            </React.Fragment>
          );
        })}
      </List>
    </Nav>
  );
}
