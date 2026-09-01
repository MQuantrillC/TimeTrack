import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Hearts } from "@/components/Hearts";
import { Nav } from "@/components/Nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TimeTrack",
  description: "Time tracking that feels calm, precise and human.",
};

export const viewport: Viewport = {
  themeColor: "#5e5c2d",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Nav />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-16">
          {children}
        </main>
        <Hearts />
      </body>
    </html>
  );
}
