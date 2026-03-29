import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Mha Phu La?",
  description: "Connect, share, and support each other on your mental health journey",
  icons: { icon: "/favicon.png" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 min-h-screen relative overflow-x-hidden`}>
        {/* Nepal flag wallpaper — shows on landing/auth pages, hidden under app's bg-white container */}
        <div
          className="pointer-events-none select-none fixed inset-0 z-0 opacity-10"
          aria-hidden="true"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, 48px)',
            gridAutoRows: '48px',
            gap: '16px',
            padding: '16px',
          }}
        >
          {Array.from({ length: 400 }).map((_, i) => (
            <span key={i} style={{ fontSize: '22px', lineHeight: '48px', textAlign: 'center' }}>🇳🇵</span>
          ))}
        </div>
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}
