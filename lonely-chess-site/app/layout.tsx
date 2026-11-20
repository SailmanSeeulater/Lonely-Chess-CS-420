import type { Metadata } from "next";
import localFont from "next/font/local";
import { Quicksand, Teko } from "next/font/google";
import "./globals.css";

const rx100 = localFont({
  src: "./fonts/RX100-Regular.woff2",
  variable: "--font-rx100",
  weight: "400",
  style: "normal",
  display: "swap",
});

const stardom = localFont({
  src: "./fonts/Stardom-Regular.woff2",
  variable: "--font-stardom",
  weight: "400",
  style: "normal",
  display: "swap",
});

const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const teko = Teko({
  variable: "--font-teko",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const siteUrl = "https://lonelychess.latesailor.dev";
const title = "Lonely Chess — a PGN chess game is the source code";
const description =
  "Lonely Chess is an esoteric programming language where a legal PGN chess game is the program. Run real Lonely Chess source in your browser: variables, loops, arithmetic, and FizzBuzz, all written as chess moves.";
const ogImage = {
  url: "/og-image.png",
  width: 1200,
  height: 630,
  type: "image/png",
  alt: "Lonely Chess — a legal PGN chess game, read as source code.",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Lonely Chess",
    title,
    description,
    images: [ogImage],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [ogImage.url],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${rx100.variable} ${stardom.variable} ${quicksand.variable} ${teko.variable} h-full scroll-smooth motion-reduce:scroll-auto antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
