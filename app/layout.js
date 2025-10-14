import ThemeRegistry from "./ThemeRegistry";
import Header from "../components/Header/Header";
import Footer from "../components/Footer/Footer";

export const metadata = {
  title: "CurioWire",
  description: "Extra! Extra! The world's curiosities — hot off the wire.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        style={{
          backgroundColor: "var(--color-bg)",
          color: "var(--color-text)",
          fontFamily: "Inter, sans-serif",
          margin: 0,
          padding: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <ThemeRegistry>
          <Header />
          <main
            style={{
              flex: 1,
              padding: "2rem",
              maxWidth: "1200px",
              margin: "0 auto",
              width: "100%",
            }}
          >
            {children}
          </main>
          <Footer />
        </ThemeRegistry>
      </body>
    </html>
  );
}
