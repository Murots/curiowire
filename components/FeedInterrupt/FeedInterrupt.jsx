// components/FeedInterrupt/FeedInterrupt.jsx
"use client";

import React from "react";
import {
  EXPLORE_TOPICS,
  EXPLORE_BLOCK_COPY,
  buildGlobalSearchHref,
} from "@/lib/feedInterrupts";

import {
  InterruptWrap,
  InterruptInner,
  InterruptEyebrow,
  InterruptTitle,
  InterruptDescription,
  TopicRow,
  TopicChip,
} from "./FeedInterrupt.styles";

export default function FeedInterrupt({ block }) {
  const type = String(block?.type || "").toLowerCase();

  if (type !== "explore_topics") return null;

  return (
    <InterruptWrap aria-label="Explore by topic">
      <InterruptInner>
        <InterruptEyebrow>{EXPLORE_BLOCK_COPY.eyebrow}</InterruptEyebrow>

        <InterruptTitle>{EXPLORE_BLOCK_COPY.title}</InterruptTitle>

        <InterruptDescription>
          {EXPLORE_BLOCK_COPY.description}
        </InterruptDescription>

        <TopicRow>
          {EXPLORE_TOPICS.map((item) => {
            const href = buildGlobalSearchHref(item.query);

            return (
              <TopicChip
                key={item.id}
                href={href}
                prefetch
                title={item.title || item.label}
                aria-label={item.title || item.label}
              >
                {item.label}
              </TopicChip>
            );
          })}
        </TopicRow>
      </InterruptInner>
    </InterruptWrap>
  );
}
