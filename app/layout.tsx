import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Huntr | AI-Powered Career Intelligence",
  description: "The state-of-the-art career dashboard that matches jobs to your resume and automatically rewrites them for 100% impact.",
  openGraph: {
    title: "Huntr",
    description: "AI-Powered Career Intelligence",
    images: ["/og-image.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Huntr",
    description: "AI-Powered Career Intelligence",
    images: ["/og-image.png"],
  },
};

import { Providers } from "@/components/Providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="mobile-gate">
          <div className="mobile-gate-content">
            <div className="mobile-gate-logo">HUNTR</div>
            <h1 className="mobile-gate-title">Desktop Only</h1>
            <p className="mobile-gate-text">
              Huntr is designed for desktop browsers. Please visit on a laptop or desktop computer for the best experience.
            </p>
          </div>
        </div>
        <div className="desktop-content">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
