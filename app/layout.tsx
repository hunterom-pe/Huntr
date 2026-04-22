import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Huntr",
  description: "Find jobs matching your resume and automatically rewrite it to perfection.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
