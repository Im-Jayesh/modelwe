import { Geist, Geist_Mono, Actor, Darker_Grotesque, GFS_Didot } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const actor = Actor({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-actor",
});

const grotesque = Darker_Grotesque({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-grotesque",
});

const didot = GFS_Didot({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-didot",
});

export const metadata = {
  title: "Model WE",
  description: "A platform to showcase and discover modeling talent.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Actor&family=GFS+Didot&display=swap"
          rel="stylesheet"
        />
        <link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:wght@400;700&display=swap" rel="stylesheet"></link>
      </head>
      
      <body
        className={`${actor.variable} ${grotesque.variable} ${didot.variable} ${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
        <Navbar/>
        {children}
        </Providers>
      </body>
    </html>
  );
}
