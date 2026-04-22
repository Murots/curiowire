// // components/FeedInterrupt/FeedInterrupt.styles.js
// import styled from "styled-components";
// import Link from "next/link";

// export const InterruptWrap = styled.section`
//   margin: 42px 0 36px;
//   padding: 0;
//   position: relative;

//   @media (max-width: 780px) {
//     margin: 32px 0 28px;
//   }
// `;

// export const InterruptInner = styled.div`
//   position: relative;
//   padding: 30px 20px 28px;
//   text-align: center;
//   overflow: hidden;

//   border-top: 1px solid transparent;
//   border-bottom: 1px solid transparent;
//   border-image: linear-gradient(
//       90deg,
//       rgba(34, 48, 92, 0.92) 0%,
//       rgba(96, 54, 142, 0.82) 16%,
//       rgba(170, 44, 108, 0.68) 34%,
//       rgba(255, 236, 244, 0.98) 50%,
//       rgba(118, 154, 255, 0.68) 66%,
//       rgba(62, 92, 176, 0.82) 84%,
//       rgba(26, 38, 74, 0.92) 100%
//     )
//     1;

//   background:
//     radial-gradient(
//       660px 230px at 50% -10%,
//       rgba(123, 74, 200, 0.19) 0%,
//       rgba(123, 74, 200, 0.11) 26%,
//       rgba(123, 74, 200, 0.045) 46%,
//       rgba(123, 74, 200, 0.012) 60%,
//       rgba(123, 74, 200, 0) 76%
//     ),
//     radial-gradient(
//       520px 180px at 24% 16%,
//       rgba(255, 166, 104, 0.075) 0%,
//       rgba(255, 166, 104, 0.03) 34%,
//       rgba(255, 166, 104, 0.008) 52%,
//       rgba(255, 166, 104, 0) 74%
//     ),
//     radial-gradient(
//       540px 180px at 78% 16%,
//       rgba(108, 164, 255, 0.09) 0%,
//       rgba(108, 164, 255, 0.04) 34%,
//       rgba(108, 164, 255, 0.012) 52%,
//       rgba(108, 164, 255, 0) 74%
//     ),
//     radial-gradient(
//       960px 280px at 50% 50%,
//       rgba(255, 255, 255, 0.26) 0%,
//       rgba(255, 255, 255, 0.1) 26%,
//       rgba(255, 255, 255, 0.025) 48%,
//       rgba(255, 255, 255, 0) 72%
//     ),
//     repeating-radial-gradient(
//       circle at 50% 50%,
//       rgba(255, 255, 255, 0.025) 0px,
//       rgba(255, 255, 255, 0.025) 1px,
//       rgba(255, 255, 255, 0) 3px,
//       rgba(255, 255, 255, 0) 11px
//     ),
//     linear-gradient(
//       180deg,
//       rgba(252, 249, 255, 0.9) 0%,
//       rgba(246, 243, 251, 0.82) 100%
//     );

//   &::before,
//   &::after {
//     content: "";
//     position: absolute;
//     left: 50%;
//     width: 108px;
//     height: 6px;
//     transform: translateX(-50%);
//     pointer-events: none;
//     opacity: 0.98;

//     background: radial-gradient(
//       ellipse at center,
//       rgba(255, 255, 255, 1) 0%,
//       rgba(255, 255, 255, 1) 11%,
//       rgba(255, 214, 190, 0.88) 28%,
//       rgba(215, 130, 255, 0.34) 52%,
//       rgba(120, 162, 255, 0.2) 72%,
//       rgba(120, 162, 255, 0) 100%
//     );

//     filter: blur(0.15px);
//   }

//   &::before {
//     top: -3px;
//   }

//   &::after {
//     bottom: -3px;
//   }

//   @media (max-width: 780px) {
//     padding: 20px 14px 19px;

//     &::before,
//     &::after {
//       width: 86px;
//       height: 6px;
//     }
//   }
// `;

// export const InterruptEyebrow = styled.div`
//   margin: 0 0 7px;
//   font-family:
//     Inter,
//     system-ui,
//     -apple-system,
//     Segoe UI,
//     Roboto,
//     Arial,
//     sans-serif;
//   font-size: 0.67rem;
//   font-weight: 800;
//   letter-spacing: 0.16em;
//   text-transform: uppercase;
//   color: ${({ theme }) => theme.colors.accent};
//   opacity: 0.96;
// `;

// export const InterruptTitle = styled.h2`
//   margin: 0;
//   font-family: "Playfair Display", serif;
//   text-transform: uppercase;
//   font-size: 1.42rem;
//   line-height: 1.08;
//   color: ${({ theme }) => theme.colors.text};
//   letter-spacing: -0.018em;
//   text-shadow: 0 1px 0 rgba(255, 255, 255, 0.32);

//   @media (max-width: 780px) {
//     font-size: 1.18rem;
//   }
// `;

// export const InterruptDescription = styled.p`
//   margin: 9px auto 0;
//   max-width: 34rem;

//   font-family:
//     Inter,
//     system-ui,
//     -apple-system,
//     Segoe UI,
//     Roboto,
//     Arial,
//     sans-serif;
//   font-size: 0.82rem;
//   line-height: 1.55;
//   color: var(--color-muted);
//   opacity: 0.95;

//   @media (max-width: 780px) {
//     font-size: 0.77rem;
//     max-width: 30ch;
//   }
// `;

// export const TopicRow = styled.div`
//   display: flex;
//   flex-wrap: wrap;
//   justify-content: center;
//   align-items: center;
//   gap: 25px;
//   margin-top: 16px;

//   @media (max-width: 780px) {
//     gap: 8px;
//     margin-top: 14px;
//   }
// `;

// export const TopicChip = styled(Link)`
//   display: inline-flex;
//   align-items: center;
//   justify-content: center;

//   min-height: 38px;
//   padding: 9px 14px;
//   border-radius: 999px;

//   background: linear-gradient(
//     180deg,
//     rgba(255, 255, 255, 0.95) 0%,
//     rgba(255, 255, 255, 0.8) 100%
//   );

//   border: 1px solid rgba(0, 0, 0, 0.08);

//   color: ${({ theme }) => theme.colors.text};
//   text-decoration: none;

//   font-family:
//     Inter,
//     system-ui,
//     -apple-system,
//     Segoe UI,
//     Roboto,
//     Arial,
//     sans-serif;
//   font-size: 0.79rem;
//   font-weight: 700;
//   line-height: 1.2;

//   box-shadow:
//     inset 0 1px 0 rgba(255, 255, 255, 0.82),
//     0 5px 14px rgba(0, 0, 0, 0.035);

//   transition:
//     transform 0.18s ease,
//     border-color 0.18s ease,
//     box-shadow 0.18s ease,
//     color 0.18s ease,
//     background 0.18s ease;

//   &:hover {
//     transform: translateY(-2px);
//     color: ${({ theme }) => theme.colors.accent};

//     border-color: rgba(149, 1, 14, 0.2);

//     background: linear-gradient(
//       180deg,
//       rgba(255, 255, 255, 0.98) 0%,
//       rgba(255, 255, 255, 0.88) 100%
//     );

//     box-shadow:
//       inset 0 1px 0 rgba(255, 255, 255, 0.88),
//       0 10px 22px rgba(0, 0, 0, 0.055),
//       0 0 0 1px rgba(149, 1, 14, 0.03);
//   }

//   &:focus-visible {
//     outline: none;
//     border-color: ${({ theme }) => theme.colors.accent};

//     box-shadow:
//       inset 0 1px 0 rgba(255, 255, 255, 0.88),
//       0 0 0 3px rgba(149, 1, 14, 0.12);
//   }

//   @media (max-width: 780px) {
//     min-height: 36px;
//     padding: 8px 12px;
//     font-size: 0.75rem;
//   }
// `;

// components/FeedInterrupt/FeedInterrupt.styles.js
import styled from "styled-components";
import Link from "next/link";

export const InterruptWrap = styled.section`
  position: relative;
  margin: 42px calc(50% - 50vw) 36px;
  padding: 0;
  isolation: isolate;

  border-top: 1px solid transparent;
  border-bottom: 1px solid transparent;
  border-image: linear-gradient(
      90deg,
      rgba(34, 48, 92, 0.92) 0%,
      rgba(96, 54, 142, 0.88) 16%,
      rgba(170, 44, 108, 0.74) 34%,
      rgba(255, 236, 244, 0.98) 50%,
      rgba(118, 154, 255, 0.74) 66%,
      rgba(62, 92, 176, 0.88) 84%,
      rgba(26, 38, 74, 0.92) 100%
    )
    1;

  background:
    radial-gradient(
      1400px 380px at 50% 14%,
      rgba(123, 74, 200, 0.13) 0%,
      rgba(123, 74, 200, 0.065) 34%,
      rgba(123, 74, 200, 0.018) 54%,
      rgba(123, 74, 200, 0) 74%
    ),
    radial-gradient(
      900px 280px at 22% 20%,
      rgba(255, 166, 104, 0.08) 0%,
      rgba(255, 166, 104, 0.03) 38%,
      rgba(255, 166, 104, 0) 72%
    ),
    radial-gradient(
      900px 280px at 78% 18%,
      rgba(108, 164, 255, 0.095) 0%,
      rgba(108, 164, 255, 0.035) 38%,
      rgba(108, 164, 255, 0) 72%
    ),
    repeating-radial-gradient(
      circle at 50% 50%,
      rgba(255, 255, 255, 0.03) 0px,
      rgba(255, 255, 255, 0.03) 1px,
      rgba(255, 255, 255, 0) 3px,
      rgba(255, 255, 255, 0) 11px
    ),
    linear-gradient(
      180deg,
      rgba(252, 249, 255, 0.98) 0%,
      rgba(243, 239, 250, 0.96) 100%
    );

  box-shadow:
    inset 0 30px 80px rgba(255, 255, 255, 0.18),
    inset 0 -20px 60px rgba(123, 74, 200, 0.04);

  @media (max-width: 780px) {
    margin: 32px calc(50% - 50vw) 28px;
  }
`;

export const InterruptInner = styled.div`
  position: relative;
  max-width: 1200px;
  margin: 0 auto;
  padding: 30px 20px 28px;
  text-align: center;
  overflow: hidden;

  background:
    radial-gradient(
      760px 260px at 50% -8%,
      rgba(123, 74, 200, 0.16) 0%,
      rgba(123, 74, 200, 0.085) 24%,
      rgba(123, 74, 200, 0.03) 44%,
      rgba(123, 74, 200, 0) 68%
    ),
    radial-gradient(
      560px 200px at 24% 16%,
      rgba(255, 166, 104, 0.07) 0%,
      rgba(255, 166, 104, 0.026) 34%,
      rgba(255, 166, 104, 0.007) 52%,
      rgba(255, 166, 104, 0) 74%
    ),
    radial-gradient(
      580px 200px at 78% 16%,
      rgba(108, 164, 255, 0.085) 0%,
      rgba(108, 164, 255, 0.032) 34%,
      rgba(108, 164, 255, 0.01) 52%,
      rgba(108, 164, 255, 0) 74%
    ),
    radial-gradient(
      980px 320px at 50% 50%,
      rgba(255, 255, 255, 0.24) 0%,
      rgba(255, 255, 255, 0.11) 26%,
      rgba(255, 255, 255, 0.03) 48%,
      rgba(255, 255, 255, 0) 72%
    ),
    repeating-radial-gradient(
      circle at 50% 50%,
      rgba(255, 255, 255, 0.028) 0px,
      rgba(255, 255, 255, 0.028) 1px,
      rgba(255, 255, 255, 0) 3px,
      rgba(255, 255, 255, 0) 11px
    ),
    linear-gradient(
      180deg,
      rgba(252, 249, 255, 0.18) 0%,
      rgba(246, 243, 251, 0.08) 100%
    );

  box-shadow: inset 0 0 90px rgba(255, 255, 255, 0.14);

  &::before,
  &::after {
    content: "";
    position: absolute;
    left: 50%;
    width: 108px;
    height: 6px;
    transform: translateX(-50%);
    pointer-events: none;
    opacity: 0.98;

    background: radial-gradient(
      ellipse at center,
      rgba(255, 255, 255, 1) 0%,
      rgba(255, 255, 255, 1) 11%,
      rgba(255, 214, 190, 0.88) 28%,
      rgba(215, 130, 255, 0.34) 52%,
      rgba(120, 162, 255, 0.2) 72%,
      rgba(120, 162, 255, 0) 100%
    );

    filter: blur(0.15px);
  }

  &::before {
    top: -3px;
  }

  &::after {
    bottom: -3px;
  }

  @media (max-width: 780px) {
    padding: 20px 14px 19px;

    &::before,
    &::after {
      width: 86px;
      height: 6px;
    }
  }
`;

export const InterruptEyebrow = styled.div`
  margin: 0 0 7px;
  font-family:
    Inter,
    system-ui,
    -apple-system,
    Segoe UI,
    Roboto,
    Arial,
    sans-serif;
  font-size: 0.67rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.accent};
  opacity: 0.96;
`;

export const InterruptTitle = styled.h2`
  margin: 0;
  font-family: "Playfair Display", serif;
  text-transform: uppercase;
  font-size: 1.42rem;
  line-height: 1.08;
  color: ${({ theme }) => theme.colors.text};
  letter-spacing: -0.018em;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.32);

  @media (max-width: 780px) {
    font-size: 1.18rem;
  }
`;

export const InterruptDescription = styled.p`
  margin: 9px auto 0;
  max-width: 34rem;

  font-family:
    Inter,
    system-ui,
    -apple-system,
    Segoe UI,
    Roboto,
    Arial,
    sans-serif;
  font-size: 0.82rem;
  line-height: 1.55;
  color: var(--color-muted);
  opacity: 0.95;

  @media (max-width: 780px) {
    font-size: 0.77rem;
    max-width: 30ch;
  }
`;

export const TopicRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 25px;
  margin-top: 16px;

  @media (max-width: 780px) {
    gap: 8px;
    margin-top: 14px;
  }
`;

export const TopicChip = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;

  min-height: 38px;
  padding: 9px 14px;
  border-radius: 999px;

  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.95) 0%,
    rgba(255, 255, 255, 0.8) 100%
  );

  border: 1px solid rgba(0, 0, 0, 0.08);

  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;

  font-family:
    Inter,
    system-ui,
    -apple-system,
    Segoe UI,
    Roboto,
    Arial,
    sans-serif;
  font-size: 0.79rem;
  font-weight: 700;
  line-height: 1.2;

  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.82),
    0 5px 14px rgba(0, 0, 0, 0.035);

  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    color 0.18s ease,
    background 0.18s ease;

  &:hover {
    transform: translateY(-2px);
    color: ${({ theme }) => theme.colors.accent};

    border-color: rgba(149, 1, 14, 0.2);

    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.98) 0%,
      rgba(255, 255, 255, 0.88) 100%
    );

    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.88),
      0 10px 22px rgba(0, 0, 0, 0.055),
      0 0 0 1px rgba(149, 1, 14, 0.03);
  }

  &:focus-visible {
    outline: none;
    border-color: ${({ theme }) => theme.colors.accent};

    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.88),
      0 0 0 3px rgba(149, 1, 14, 0.12);
  }

  @media (max-width: 780px) {
    min-height: 36px;
    padding: 8px 12px;
    font-size: 0.75rem;
  }
`;
