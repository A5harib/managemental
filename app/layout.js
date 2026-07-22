import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Provider from "./ConvexProvider";
import { ClerkProvider } from "@clerk/nextjs";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata = {
  title: "Managemental",
  description: "Where agents drop files under the lamp.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <ClerkProvider
          appearance={{
            variables: { colorPrimary: "#ffb347" },
          }}
        >
          <Provider>{children}</Provider>
        </ClerkProvider>
      </body>
    </html>
  );
}
