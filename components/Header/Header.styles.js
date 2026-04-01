// // components/Header/Header.styles.js
// import styled from "styled-components";

// export const HeaderWrapper = styled.header`
//   width: 100%;
//   background: ${({ theme }) => theme.colors.bgAlt || "#e9e9e9"};
//   position: sticky;
//   top: 0;
//   z-index: 50;
//   border-bottom: solid;
//   border-width: 3px;
//   border-color: ${({ theme }) => theme.colors.accent};
// `;

// export const Inner = styled.div`
//   width: 100%;
//   max-width: 1400px;
//   margin: 0 auto;

//   padding: 14px 18px;
//   display: flex;
//   align-items: center;
//   gap: 14px;

//   position: relative;
// `;

// export const Logo = styled.div`
//   display: inline-flex;
//   align-items: center;
//   justify-content: center;

//   a {
//     display: inline-flex;
//     align-items: center;
//     justify-content: center;
//   }

//   img {
//     display: block;
//     height: 28px;
//     width: auto;
//   }

//   @media (max-width: 770px) {
//     img {
//       height: 26px;
//     }
//   }
// `;

// export const DesktopSearchWrap = styled.div`
//   margin-left: auto;
//   position: relative;
//   width: min(350px, 100%);

//   @media (max-width: 770px) {
//     display: none;
//   }
// `;

// export const SearchInput = styled.input`
//   width: 100%;
//   border: 1px solid rgba(0, 0, 0, 0.14);
//   background: rgba(255, 255, 255, 0.65);
//   border-radius: 18px;
//   padding: 8px 38px 8px 12px;

//   font-family:
//     Inter,
//     system-ui,
//     -apple-system,
//     Segoe UI,
//     Roboto,
//     Arial,
//     sans-serif;
//   font-size: 0.85rem;
//   color: ${({ theme }) => theme.colors.text};

//   &:focus {
//     outline: none;
//     border-color: rgba(0, 0, 0, 0.22);
//     background: rgba(255, 255, 255, 0.8);
//   }
// `;

// export const ClearButton = styled.button`
//   position: absolute;
//   right: 10px;
//   top: 50%;
//   transform: translateY(-50%);

//   width: 28px;
//   height: 28px;
//   border-radius: 999px;
//   border: 0;
//   cursor: pointer;

//   background: rgba(0, 0, 0, 0.08);
//   color: rgba(0, 0, 0, 0.75);

//   &:hover {
//     background: rgba(0, 0, 0, 0.12);
//   }
// `;

// export const FilterButton = styled.button`
//   display: none;
//   border: 0;
//   background: transparent;
//   cursor: pointer;

//   color: ${({ theme }) => theme.colors.text};
//   padding: 6px;
//   border-radius: 10px;

//   &:hover {
//     background: rgba(0, 0, 0, 0.06);
//   }

//   @media (max-width: 770px) {
//     display: inline-flex;
//     align-items: center;
//     justify-content: center;

//     /* header should show logo + filter icon */
//     margin-left: auto;
//   }
// `;

// export const MobileMenu = styled.div`
//   position: fixed;
//   inset: 0;
//   background: rgba(0, 0, 0, 0.4);
//   backdrop-filter: blur(6px);
//   z-index: 80;

//   display: flex;
//   justify-content: flex-end;
// `;

// export const MobilePanel = styled.div`
//   width: min(520px, 92vw);
//   height: 100vh;
//   background: rgba(249, 249, 251, 0.98);

//   padding: 18px;
//   position: relative;

//   box-shadow: -20px 0 60px rgba(0, 0, 0, 0.25);

//   animation: cwSlideInRight 220ms cubic-bezier(0.22, 1, 0.36, 1);

//   @keyframes cwSlideInRight {
//     from {
//       transform: translateX(18px);
//       opacity: 0.85;
//     }
//     to {
//       transform: translateX(0);
//       opacity: 1;
//     }
//   }
// `;

// export const CloseMobile = styled.button`
//   position: absolute;
//   right: 14px;
//   top: 14px;

//   border: 0;
//   background: rgba(0, 0, 0, 0.08);
//   width: 36px;
//   height: 36px;
//   border-radius: 10px;
//   cursor: pointer;

//   &:hover {
//     background: rgba(0, 0, 0, 0.12);
//   }
// `;

// export const MobileTitle = styled.div`
//   font-family: "Playfair Display", serif;
//   font-size: 1.25rem;
//   font-weight: 700;
//   margin: 6px 0 14px;
// `;

// export const MobileSearchWrap = styled.div`
//   position: relative;
//   margin: 10px 0 18px;
// `;

// export const MobileRow = styled.div`
//   display: flex;
//   flex-direction: column;
//   gap: 8px;
//   margin: 14px 0;
// `;

// export const MobileLabel = styled.div`
//   font-family:
//     Inter,
//     system-ui,
//     -apple-system,
//     Segoe UI,
//     Roboto,
//     Arial,
//     sans-serif;
//   font-size: 0.75rem;
//   font-weight: 600;
//   color: rgba(0, 0, 0, 0.62);
//   letter-spacing: 0.02em;
// `;

// export const MobileSelect = styled.select`
//   appearance: none;
//   -webkit-appearance: none;
//   -moz-appearance: none;

//   background-color: rgba(255, 255, 255, 0.8);
//   border: 1px solid rgba(0, 0, 0, 0.14);
//   color: ${({ theme }) => theme.colors.text};

//   padding: 11px 42px 11px 12px;
//   border-radius: 6px;

//   font-family:
//     Inter,
//     system-ui,
//     -apple-system,
//     Segoe UI,
//     Roboto,
//     Arial,
//     sans-serif;
//   font-size: 0.85rem;
//   font-weight: 500;

//   background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
//   background-repeat: no-repeat;
//   background-position: right 14px center;
//   background-size: 16px;

//   &:focus {
//     outline: none;
//     border-color: rgba(0, 0, 0, 0.22);
//   }
// `;

import styled from "styled-components";

export const HeaderWrapper = styled.header`
  width: 100%;
  position: sticky;
  top: 0;
  z-index: 50;
  overflow: hidden;

  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    0 10px 30px rgba(6, 8, 18, 0.2),
    inset 0 -1px 0 rgba(255, 255, 255, 0.05),
    inset 0 -14px 34px rgba(255, 120, 140, 0.04);

  background:
    radial-gradient(
      900px 220px at 10% 8%,
      rgba(255, 128, 72, 0.18) 0%,
      rgba(255, 128, 72, 0.07) 32%,
      rgba(255, 128, 72, 0) 68%
    ),
    radial-gradient(
      1150px 260px at 48% 18%,
      rgba(172, 66, 255, 0.2) 0%,
      rgba(172, 66, 255, 0.09) 28%,
      rgba(172, 66, 255, 0) 68%
    ),
    radial-gradient(
      920px 220px at 88% 10%,
      rgba(72, 146, 255, 0.2) 0%,
      rgba(72, 146, 255, 0.08) 32%,
      rgba(72, 146, 255, 0) 68%
    ),
    radial-gradient(
      860px 180px at 52% 100%,
      rgba(255, 86, 142, 0.18) 0%,
      rgba(255, 86, 142, 0.09) 30%,
      rgba(255, 86, 142, 0) 72%
    ),
    linear-gradient(
      90deg,
      #060913 0%,
      #0c1223 18%,
      #19102d 48%,
      #0f1730 78%,
      #06101b 100%
    );

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0.8;
    background:
      radial-gradient(
        circle at 5% 28%,
        rgba(255, 255, 255, 0.9) 0 1px,
        transparent 2px
      ),
      radial-gradient(
        circle at 10% 68%,
        rgba(255, 255, 255, 0.55) 0 1px,
        transparent 2px
      ),
      radial-gradient(
        circle at 17% 20%,
        rgba(255, 210, 170, 0.95) 0 1.4px,
        transparent 2.6px
      ),
      radial-gradient(
        circle at 23% 58%,
        rgba(255, 255, 255, 0.48) 0 1px,
        transparent 2px
      ),
      radial-gradient(
        circle at 31% 18%,
        rgba(255, 255, 255, 0.52) 0 1px,
        transparent 2px
      ),
      radial-gradient(
        circle at 38% 72%,
        rgba(255, 155, 122, 0.55) 0 1.3px,
        transparent 2.4px
      ),
      radial-gradient(
        circle at 47% 26%,
        rgba(255, 255, 255, 0.45) 0 1px,
        transparent 2px
      ),
      radial-gradient(
        circle at 54% 17%,
        rgba(255, 226, 236, 0.95) 0 1.4px,
        transparent 2.7px
      ),
      radial-gradient(
        circle at 61% 64%,
        rgba(255, 255, 255, 0.42) 0 1px,
        transparent 2px
      ),
      radial-gradient(
        circle at 69% 22%,
        rgba(255, 120, 176, 0.62) 0 1.2px,
        transparent 2.3px
      ),
      radial-gradient(
        circle at 76% 16%,
        rgba(130, 190, 255, 0.95) 0 1.5px,
        transparent 2.8px
      ),
      radial-gradient(
        circle at 84% 56%,
        rgba(255, 255, 255, 0.44) 0 1px,
        transparent 2px
      ),
      radial-gradient(
        circle at 92% 24%,
        rgba(255, 255, 255, 0.7) 0 1.1px,
        transparent 2.2px
      ),
      radial-gradient(
        280px 110px at 12% 30%,
        rgba(255, 138, 80, 0.08) 0%,
        rgba(255, 138, 80, 0) 72%
      ),
      radial-gradient(
        420px 130px at 54% 20%,
        rgba(205, 96, 255, 0.1) 0%,
        rgba(205, 96, 255, 0) 72%
      ),
      radial-gradient(
        340px 110px at 86% 26%,
        rgba(85, 160, 255, 0.08) 0%,
        rgba(85, 160, 255, 0) 74%
      );
  }

  &::after {
    content: "";
    position: absolute;
    left: -10%;
    right: -10%;
    bottom: 0;
    height: 3px;
    pointer-events: none;
    background: linear-gradient(
      90deg,
      rgba(255, 122, 84, 0.08) 0%,
      rgba(255, 160, 96, 0.24) 14%,
      rgba(255, 124, 166, 0.45) 34%,
      rgba(255, 245, 255, 0.98) 50%,
      rgba(124, 182, 255, 0.48) 66%,
      rgba(72, 142, 255, 0.22) 84%,
      rgba(72, 142, 255, 0.08) 100%
    );
    box-shadow:
      0 0 10px rgba(255, 120, 140, 0.32),
      0 0 24px rgba(255, 120, 140, 0.22),
      0 0 40px rgba(100, 170, 255, 0.15);
  }
`;

export const Inner = styled.div`
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 12px 18px;
  display: flex;
  align-items: center;
  gap: 14px;
  position: relative;
  z-index: 2;
  min-height: 78px;

  @media (max-width: 770px) {
    min-height: 68px;
    padding: 10px 14px;
  }
`;

export const LogoBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  min-width: 0;
  position: relative;
  padding-right: 8px;

  &::before {
    content: "";
    position: absolute;
    inset: -10px -18px -10px -12px;
    pointer-events: none;
    background: radial-gradient(
      circle at 22% 50%,
      rgba(255, 170, 90, 0.12) 0%,
      rgba(255, 170, 90, 0.05) 34%,
      rgba(255, 170, 90, 0) 72%
    );
    filter: blur(14px);
  }
`;

export const Logo = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;

  a {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 14px;
    transition:
      transform 180ms ease,
      opacity 180ms ease,
      filter 180ms ease;
  }

  a:hover {
    transform: translateY(-1px);
    filter: drop-shadow(0 4px 12px rgba(255, 160, 90, 0.2));
  }

  img {
    display: block;
    height: 30px;
    width: auto;
    filter: drop-shadow(0 1px 0 rgba(255, 255, 255, 0.12))
      drop-shadow(0 2px 14px rgba(255, 255, 255, 0.08));
  }

  @media (max-width: 770px) {
    img {
      height: 27px;
    }
  }
`;

export const Tagline = styled.div`
  margin-top: 4px;
  margin-left: 2px;

  font-family:
    Inter,
    system-ui,
    -apple-system,
    Segoe UI,
    Roboto,
    Arial,
    sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.68);
  text-shadow:
    0 1px 8px rgba(0, 0, 0, 0.35),
    0 0 16px rgba(255, 120, 160, 0.08);
  white-space: nowrap;

  @media (max-width: 980px) {
    font-size: 0.66rem;
    letter-spacing: 0.06em;
  }

  @media (max-width: 770px) {
    display: none;
  }
`;

export const DesktopSearchWrap = styled.div`
  margin-left: auto;
  position: relative;
  width: min(400px, 100%);

  &::before {
    content: "";
    position: absolute;
    inset: -10px -14px;
    pointer-events: none;
    background: radial-gradient(
      circle at 70% 50%,
      rgba(88, 146, 255, 0.12) 0%,
      rgba(88, 146, 255, 0.04) 42%,
      rgba(88, 146, 255, 0) 74%
    );
    filter: blur(16px);
  }

  @media (max-width: 770px) {
    display: none;
  }
`;

export const SearchInput = styled.input`
  width: 100%;
  position: relative;
  z-index: 1;

  border: 1px solid rgba(255, 255, 255, 0.16);
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.16) 0%,
    rgba(160, 185, 255, 0.08) 100%
  );
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 999px;
  padding: 10px 42px 10px 14px;

  font-family:
    Inter,
    system-ui,
    -apple-system,
    Segoe UI,
    Roboto,
    Arial,
    sans-serif;
  font-size: 0.88rem;
  color: rgba(255, 255, 255, 0.96);

  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    0 8px 20px rgba(0, 0, 0, 0.18);

  &::placeholder {
    color: rgba(255, 255, 255, 0.74);
  }

  &:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.28);
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.2) 0%,
      rgba(170, 190, 255, 0.1) 100%
    );
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.14),
      0 0 0 3px rgba(255, 130, 150, 0.12),
      0 10px 24px rgba(0, 0, 0, 0.22);
  }
`;

export const ClearButton = styled.button`
  position: absolute;
  right: 9px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;

  width: 28px;
  height: 28px;
  border-radius: 999px;
  border: 0;
  cursor: pointer;

  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.9);

  transition:
    background 150ms ease,
    transform 150ms ease;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  &:active {
    transform: translateY(-50%) scale(0.97);
  }
`;

export const FilterButton = styled.button`
  display: none;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.18) 0%,
    rgba(170, 190, 255, 0.08) 100%
  );
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  cursor: pointer;

  color: rgba(255, 255, 255, 0.95);
  padding: 8px;
  border-radius: 12px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 6px 18px rgba(0, 0, 0, 0.18);

  transition:
    transform 150ms ease,
    background 150ms ease,
    border-color 150ms ease;

  &:hover {
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.22) 0%,
      rgba(180, 198, 255, 0.1) 100%
    );
    border-color: rgba(255, 255, 255, 0.22);
  }

  &:active {
    transform: scale(0.97);
  }

  @media (max-width: 770px) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-left: auto;
  }
`;

export const MobileMenu = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(5, 7, 16, 0.56);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 80;

  display: flex;
  justify-content: flex-end;
`;

export const MobilePanel = styled.div`
  width: min(520px, 92vw);
  height: 100vh;
  background:
    radial-gradient(
      720px 260px at 18% 0%,
      rgba(255, 144, 90, 0.14) 0%,
      rgba(255, 144, 90, 0) 58%
    ),
    radial-gradient(
      760px 280px at 100% 0%,
      rgba(88, 150, 255, 0.16) 0%,
      rgba(88, 150, 255, 0) 60%
    ),
    radial-gradient(
      680px 220px at 50% 100%,
      rgba(255, 96, 160, 0.08) 0%,
      rgba(255, 96, 160, 0) 66%
    ),
    linear-gradient(
      180deg,
      rgba(20, 24, 40, 0.98) 0%,
      rgba(13, 16, 28, 0.98) 100%
    );

  padding: 18px;
  position: relative;
  box-shadow: -20px 0 60px rgba(0, 0, 0, 0.35);

  animation: cwSlideInRight 220ms cubic-bezier(0.22, 1, 0.36, 1);

  @keyframes cwSlideInRight {
    from {
      transform: translateX(18px);
      opacity: 0.85;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;

export const CloseMobile = styled.button`
  position: absolute;
  right: 14px;
  top: 14px;

  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.92);
  width: 36px;
  height: 36px;
  border-radius: 10px;
  cursor: pointer;

  &:hover {
    background: rgba(255, 255, 255, 0.12);
  }
`;

export const MobileTitle = styled.div`
  font-family: "Playfair Display", serif;
  font-size: 1.25rem;
  font-weight: 700;
  margin: 6px 0 14px;
  color: rgba(255, 255, 255, 0.96);
`;

export const MobileSearchWrap = styled.div`
  position: relative;
  margin: 10px 0 18px;
`;

export const MobileRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 14px 0;
`;

export const MobileLabel = styled.div`
  font-family:
    Inter,
    system-ui,
    -apple-system,
    Segoe UI,
    Roboto,
    Arial,
    sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.62);
  letter-spacing: 0.02em;
`;

export const MobileSelect = styled.select`
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;

  background-color: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: rgba(255, 255, 255, 0.96);

  padding: 11px 42px 11px 12px;
  border-radius: 10px;

  font-family:
    Inter,
    system-ui,
    -apple-system,
    Segoe UI,
    Roboto,
    Arial,
    sans-serif;
  font-size: 0.85rem;
  font-weight: 500;

  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-opacity='0.72' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  background-size: 16px;

  &:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.26);
  }

  option {
    color: #111;
  }
`;
