"use client";

import React from "react";
import Link from "next/link";
import {
  Card,
  ImageWrapper,
  Image,
  Content,
  Meta,
  Title,
  ReadMore,
} from "./ArticleCard.styles";

import { cleanText } from "@/app/api/utils/cleanText";

export default function ArticleCard({
  id,
  category,
  title,
  image_url,
  created_at,
  index,
  view_count,
}) {
  const formattedDate = new Date(created_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const isEven = index % 2 === 0;

  return (
    <Link href={`/article/${id}`}>
      <Card $reverse={isEven}>
        <ImageWrapper>
          {image_url && <Image src={image_url} alt={cleanText(title)} />}
        </ImageWrapper>

        <Content>
          <Meta>
            <span>{category.toUpperCase()}</span> — {formattedDate}
          </Meta>

          <Title>{cleanText(title)}</Title>

          <ReadMore>Read more →</ReadMore>
        </Content>
      </Card>
    </Link>
  );
}

// "use client";

// import React, { useState, useEffect, useRef } from "react";
// import Link from "next/link";
// import {
//   Card,
//   ImageWrapper,
//   Image,
//   Content,
//   Meta,
//   Title,
//   ReadMore,
// } from "./ArticleCard.styles";
// import { cleanText } from "@/app/api/utils/cleanText";

// export default function ArticleCard({
//   id,
//   category,
//   title,
//   image_url,
//   created_at,
//   index,
//   view_count,
// }) {
//   const [scale, setScale] = useState(1);
//   const imgRef = useRef(null);
//   const formattedDate = new Date(created_at).toLocaleDateString("en-GB", {
//     day: "numeric",
//     month: "short",
//     year: "numeric",
//   });
//   const isEven = index % 2 === 0;

//   // 📏 Beregn skalering basert på forhold
//   useEffect(() => {
//     const img = imgRef.current;
//     if (!img) return;

//     const handleLoad = () => {
//       const containerRatio = 16 / 9;
//       const imageRatio = img.naturalWidth / img.naturalHeight;

//       // Hvis bildet er mye bredere eller høyere, juster zoom ut
//       let newScale = 1;

//       if (imageRatio > containerRatio) {
//         // bredt bilde – zoom litt ut horisontalt
//         newScale = 0.93;
//       } else if (imageRatio < containerRatio) {
//         // smalt (høyt) bilde – zoom mindre
//         newScale = 0.96;
//       }

//       setScale(newScale);
//     };

//     img.addEventListener("load", handleLoad);
//     return () => img.removeEventListener("load", handleLoad);
//   }, [image_url]);

//   return (
//     <Link href={`/article/${id}`}>
//       <Card $reverse={isEven}>
//         <ImageWrapper>
//           {image_url && (
//             <Image
//               ref={imgRef}
//               src={image_url}
//               alt={cleanText(title)}
//               $scale={scale}
//             />
//           )}
//         </ImageWrapper>

//         <Content>
//           <Meta>
//             <span>{category.toUpperCase()}</span> — {formattedDate}
//           </Meta>

//           <Title>{cleanText(title)}</Title>

//           <ReadMore>Read more →</ReadMore>
//         </Content>
//       </Card>
//     </Link>
//   );
// }
