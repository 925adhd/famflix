import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "./components/Sidebar";
import { MobileHeader } from "./components/MobileHeader";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { PwaRegister } from "./components/PwaRegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Famflix",
  description: "A private streaming library for the family.",
  applicationName: "Famflix",
  appleWebApp: {
    capable: true,
    title: "Famflix",
    statusBarStyle: "black-translucent",
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0f",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PwaRegister />
        <Sidebar />
        <MobileHeader />
        <MobileBottomNav />
        <div className="flex flex-1 flex-col pt-14 pb-16 md:pb-0 md:pl-16 md:pt-0">
          {children}
        </div>
      </body>
    </html>
  );
}
