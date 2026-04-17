import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import NeuralBackground from "@/components/layout/NeuralBackground";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Tools Hub - 发现最佳 AI 工具",
  description: "跨生态系统的 AI 工具搜索引擎 — 发现 MCP Server、AI Agent、RAG 工具等最前沿的智能工具。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <div className="relative min-h-screen flex flex-col">
          {/* Background layer — absolute, inside the container */}
          <NeuralBackground />
          {/* Content layer — above background */}
          <div className="relative flex min-h-screen flex-col" style={{ zIndex: 1 }}>
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </div>
      </body>
    </html>
  );
}
