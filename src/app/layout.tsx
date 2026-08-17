import type { Metadata, Viewport } from "next";
import { Nunito_Sans, Quicksand } from "next/font/google";
import "./globals.css";

const quiksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin", "latin-ext", "vietnamese"],
  display: "swap",
});

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  subsets: ["latin", "latin-ext", "vietnamese"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Phù Đổng Class Management",
    template: "%s | Phù Đổng Class Management",
  },
  description:
    "Quản lý lớp học tích cực, ghi nhận hành vi tốt và theo dõi tiến bộ của học sinh.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/phudong-192.svg", apple: "/icons/phudong-192.svg" },
};

export const viewport: Viewport = {
  themeColor: "#005da7",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={quiksand.variable + " " + nunitoSans.variable}>
      <body>{children}</body>
    </html>
  );
}
