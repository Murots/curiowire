// components/FeedInterrupt/FeedInterrupt.jsx
"use client";

import React from "react";
import {
  EXPLORE_TOPICS,
  EXPLORE_BLOCK_COPY,
  VIDEO_BLOCK_COPY,
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

import VideoCarouselBlock from "./VideoCarouselBlock";

export default function FeedInterrupt({ block, videoItems = [] }) {
  const type = String(block?.type || "").toLowerCase();

  if (type === "explore_topics") {
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

  if (type === "video_carousel") {
    if (!Array.isArray(videoItems) || videoItems.length === 0) return null;

    return (
      <InterruptWrap aria-label="This week's videos">
        <InterruptInner>
          <InterruptEyebrow>{VIDEO_BLOCK_COPY.eyebrow}</InterruptEyebrow>

          <InterruptTitle>{VIDEO_BLOCK_COPY.title}</InterruptTitle>

          <InterruptDescription>
            {VIDEO_BLOCK_COPY.description}
          </InterruptDescription>

          <VideoCarouselBlock items={videoItems} />
        </InterruptInner>
      </InterruptWrap>
    );
  }

  return null;
}
