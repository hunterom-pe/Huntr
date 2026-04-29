import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Huntr",
  description: "Find jobs matching your resume and automatically rewrite it to perfection.",
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
