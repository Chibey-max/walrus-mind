import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Walrus Mind — Decentralized AI Memory on Sui",
  description:
    "AI agent with decentralized memory stored as Walrus blobs, anchored to live Sui checkpoints via Tatum RPC. Built for Tatum × Walrus Hackathon.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: "#080b0f", overflow: "hidden" }}>
        {children}
      </body>
    </html>
  );
}
