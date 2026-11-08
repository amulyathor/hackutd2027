import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NexusDC | CBRE × NorthMark (NMC²) × NVIDIA Nemotron Autonomous Data Center Twin",
  description:
    "Autonomous Spatial Digital Twin, Hardware Replacement Clustering & Cross-Silo Cascading Failure Engine built for CBRE, NorthMark Compute & Cloud, and NVIDIA Nemotron.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#040710] text-slate-100 antialiased selection:bg-emerald-500/30 selection:text-emerald-200">
        {children}
      </body>
    </html>
  );
}

