import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { FontScaleProvider } from "@/components/FontScaleProvider";
import { ThemeProvider } from "@/components/ThemeProvider";

// Inter - Professional, highly readable sans-serif for UI
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// JetBrains Mono - Professional monospace font optimized for code
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Z.ai Code Scaffold - AI-Powered Development",
  description: "Modern Next.js scaffold optimized for AI-powered development with Z.ai. Built with TypeScript, Tailwind CSS, and shadcn/ui.",
  keywords: ["Z.ai", "Next.js", "TypeScript", "Tailwind CSS", "shadcn/ui", "AI development", "React"],
  authors: [{ name: "Z.ai Team" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Z.ai Code Scaffold",
    description: "AI-powered development with modern React stack",
    url: "https://chat.z.ai",
    siteName: "Z.ai",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Z.ai Code Scaffold",
    description: "AI-powered development with modern React stack",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Blocking script to apply saved theme before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('ai-agent-storage');
                  var settings = {};

                  if (stored) {
                    var data = JSON.parse(stored);
                    settings = data?.state?.settings || {};
                  }

                  // Apply font scale (default 1)
                  var scale = settings.fontScale || 1;
                  document.documentElement.style.setProperty('--font-scale', scale);
                  document.documentElement.style.fontSize = (16 * scale) + 'px';

                  // Apply visual theme (default 'unthemed')
                  var theme = settings.theme || 'unthemed';
                  document.documentElement.setAttribute('data-theme', theme);

                  // Apply dark class for dark themes
                  if (theme === 'dark' || theme === 'midnight' || theme === 'slate') {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-background text-foreground`}
      >
        <ThemeProvider>
          <FontScaleProvider>
            {children}
          </FontScaleProvider>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
