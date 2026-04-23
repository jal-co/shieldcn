import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
})

const siteUrl = "https://shieldcn.dev"

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "shieldcn",
    template: "%s — shieldcn",
  },
  description:
    "Beautiful README badges as a service. A shields.io alternative with the visual quality of shadcn/ui components.",
  keywords: [
    "badges",
    "shields",
    "readme badges",
    "github badges",
    "npm badges",
    "svg badges",
    "shields.io alternative",
    "shadcn",
  ],
  authors: [{ name: "Justin Levine", url: "https://justinlevine.me" }],
  creator: "Justin Levine",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "shieldcn",
    title: "shieldcn",
    description:
      "Beautiful README badges as a service. A shields.io alternative with the visual quality of shadcn/ui components.",
  },
  twitter: {
    card: "summary_large_image",
    title: "shieldcn",
    description:
      "Beautiful README badges as a service. A shields.io alternative with the visual quality of shadcn/ui components.",
  },
  alternates: {
    canonical: siteUrl,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geist.variable} ${geistMono.variable}`}
    >
      <body className="antialiased font-sans">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
