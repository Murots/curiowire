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
      <body>
        <ThemeRegistry>
          {/* 🌍 Globale stiler håndteres inni ThemeRegistry */}
          <Header />
          <main>{children}</main>
          <Footer />
        </ThemeRegistry>
      </body>
    </html>
  );
}
