import { Nav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { ForResidents } from "@/components/landing/for-residents";
import { ForMairies } from "@/components/landing/for-mairies";
import { CommunesGrid } from "@/components/landing/communes-grid";
import { MobileSection } from "@/components/landing/mobile-section";
import { Faq } from "@/components/landing/faq";
import { Footer } from "@/components/landing/footer";

export const revalidate = 3600;

export const metadata = {
  title: "Ma Commune — Le village dans votre poche, la mairie en direct",
  description:
    "Une plateforme simple pour les petites communes rurales : annonces officielles, événements, entraide, producteurs locaux. App mobile pour les habitants, panneau web pour le secrétariat.",
};

export default function Home() {
  return (
    <main className="bg-[#FBF7F1]">
      <Nav />
      <Hero />
      <HowItWorks />
      <ForResidents />
      <ForMairies />
      <CommunesGrid />
      <MobileSection />
      <Faq />
      <Footer />
    </main>
  );
}
