// app/page.styles.js
import styled from "styled-components";

export const Wrapper = styled.div`
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 18px 0 70px;
  color: var(--color-text);
`;

export const TopBar = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin: 0 0 30px;

  border-radius: 14px;

  position: relative;

  @media (max-width: 780px) {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
`;

export const Title = styled.h1`
  margin: 0;
  font-family: "Playfair Display", serif;
  font-size: 1.75rem;
  line-height: 1.1;

  @media (max-width: 780px) {
    font-size: 1.55rem;
  }
`;

export const Controls = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;

  @media (max-width: 770px) {
    display: none; /* ✅ controls flyttes inn i mobil-meny */
  }
`;

export const Select = styled.select`
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;

  background-color: rgba(255, 255, 255, 0.65);
  border: 1px solid rgba(0, 0, 0, 0.14);
  color: var(--color-text);

  padding: 10px 42px 10px 12px; /* room for caret */
  border-radius: 6px;

  font-family:
    Inter,
    system-ui,
    -apple-system,
    Segoe UI,
    Roboto,
    Arial,
    sans-serif;
  font-size: 0.8rem;
  font-weight: 500;

  letter-spacing: 0.02em;
  line-height: 1;

  /* custom caret */
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  background-size: 16px;

  &:hover {
    border-color: #cccccc;
    background-color: ${({ theme }) => theme.colors.bgAlt};
  }

  // &:focus {
  //   outline: none;
  //   border-color: ${({ theme }) => theme.colors.bgAlt};
  // }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.accent};
    box-shadow: 0 0 0 3px rgba(149, 1, 14, 0.12);
  }

  @media (max-width: 780px) {
    width: 100%;
  }
`;

export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 16px;
  grid-auto-flow: dense;

  @media (max-width: 780px) {
    gap: 12px;
  }
`;

export const LoadMore = styled.button`
  display: flex; /* ⬅️ bytt fra inline-flex */
  align-items: center;
  justify-content: center;
  gap: 10px;

  width: fit-content; /* ⬅️ gjør at den blir “så bred som innholdet” */
  margin: 22px auto 0; /* ⬅️ auto på sidene = midtstilt */

  padding: 12px 18px;
  border-radius: 12px;

  background: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(0, 0, 0, 0.12);

  color: ${({ theme }) => theme.colors.text};
  font-family:
    Inter,
    system-ui,
    -apple-system,
    Segoe UI,
    Roboto,
    Arial,
    sans-serif;
  font-weight: 600;
  font-size: 0.95rem;

  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border 0.2s ease,
    color 0.2s ease,
    background 0.2s ease;

  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.05);

  &:hover {
    color: ${({ theme }) => theme.colors.accent};
    transform: translateY(-2px);
    border-color: rgba(0, 0, 0, 0.18);
    background: rgba(255, 255, 255, 0.75);
  }

  &:disabled {
    opacity: 0.6;
    cursor: default;
    transform: none;
  }
`;

export const Loader = styled.p`
  text-align: center;
  margin-top: 150px;
  color: var(--color-muted);
`;

export const Divider = styled.div`
  width: 90px;
  height: 3px;
  border-radius: 3px;
  margin: 5px 0 0;
  background: ${({ theme }) => theme.colors.accent};
`;
