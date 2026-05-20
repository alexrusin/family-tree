import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

// Root layout provides the required <html>/<body> shell.
// The [lang] segment sets the lang attribute dynamically via LangSetter.
// proxy.ts redirects all bare paths to the appropriate locale prefix.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning>
      <body className={`${inter.variable} min-h-screen flex flex-col`}>
        {children}
      </body>
    </html>
  );
}
