import type { Metadata } from "next";

import "@xyflow/react/dist/style.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Surveyboard",
  description: "勘点任务台 · Next.js + shadcn/ui + 高德地图",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="h-full overflow-hidden">{children}</body>
    </html>
  );
}
