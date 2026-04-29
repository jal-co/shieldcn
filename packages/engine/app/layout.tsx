export const metadata = {
  title: "shieldcn engine",
  description: "Self-hosted badge rendering engine",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
