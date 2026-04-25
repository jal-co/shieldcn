import type { Metadata } from "next"
import { Fira_Code, Geist, Sora } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Analytics } from "@/components/analytics"
import "./globals.css"
import { cn } from "@/lib/utils"

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
})

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
})

const firaCode = Fira_Code({
  subsets: ["latin"],
  variable: "--font-fira-code",
})

const siteUrl = "https://shieldcn.dev"
const ogImage = `${siteUrl}/og.png`

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "shieldcn",
    template: "%s — shieldcn",
  },
  description:
    "Beautiful README badges as a service. A shields.io alternative with the visual quality of shadcn/ui. 5,000+ built-in icons and custom SVG upload.",
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
      "Beautiful README badges as a service. A shields.io alternative with the visual quality of shadcn/ui. 5,000+ built-in icons and custom SVG upload.",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "shieldcn",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "shieldcn",
    description:
      "Beautiful README badges as a service. A shields.io alternative with the visual quality of shadcn/ui. 5,000+ built-in icons and custom SVG upload.",
    images: [ogImage],
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
      className={cn(geist.variable, sora.variable, firaCode.variable)}
    >
      <body className="antialiased font-sans">
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
