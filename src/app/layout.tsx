import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { FlagBackground } from "@/components/FlagBackground";

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
        <FlagBackground />
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}
