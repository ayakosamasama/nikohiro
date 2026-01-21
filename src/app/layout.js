import "./globals.css";
import { Zen_Maru_Gothic } from "next/font/google"; // Import font
import { AuthProvider } from "../context/AuthContext";
import Header from "../components/Header";
import TimeLimitGuard from "../components/TimeLimitGuard";

// Configure font
const zenMaruGothic = Zen_Maru_Gothic({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  display: 'swap',
});

export const metadata = {
  title: "にこにこひろば",
  description: "こどもたちのためのあんしんSNS",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body className={zenMaruGothic.className}>
        <AuthProvider>
          <TimeLimitGuard>
            <Header />
            <main className="container">
              {children}
            </main>
          </TimeLimitGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
