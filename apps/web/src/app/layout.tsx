import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { PostHogMonitoringProvider } from "@/components/posthog-provider";
import { ProfileProviderWrapper } from "@/components/profile-provider";
import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });

export const metadata: Metadata = {
  title: "Pretou",
  description: "L'app des communes rurales — annonces officielles, événements, entraide.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={`${dmSans.variable} ${dmSans.className} antialiased`}>
        <PostHogMonitoringProvider>
          <ProfileProviderWrapper>
            {children}
          </ProfileProviderWrapper>
        </PostHogMonitoringProvider>
      </body>
    </html>
  );
}
