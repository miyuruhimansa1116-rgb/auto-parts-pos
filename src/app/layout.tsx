import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Auto Electrical POS System",
  description: "POS and Inventory Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="si">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-100 text-gray-900`}
      >
        <div className="flex h-screen overflow-hidden">
          {/* Active Status සහිත Sidebar Component එක */}
          <Sidebar />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-y-auto">
            {/* Mobile Top Navigation Header */}
            <header className="bg-white border-b p-4 flex sm:hidden justify-between items-center shadow-xs">
              <span className="font-bold text-blue-600">⚡ Auto Electrical</span>
              <div className="flex gap-3 text-xs font-semibold">
                <Link href="/" className="text-gray-700">Home</Link>
                <Link href="/pos" className="text-blue-600">POS</Link>
                <Link href="/products" className="text-gray-700">Products</Link>
                <Link href="/reports" className="text-gray-700">Reports</Link>
              </div>
            </header>

            <main className="flex-1 p-6">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}