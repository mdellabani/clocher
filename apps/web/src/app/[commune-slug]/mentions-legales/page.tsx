import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCommuneBySlugCached } from "@/lib/cached-fetchers/commune";

type Props = { params: Promise<{ "commune-slug": string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { "commune-slug": slug } = await params;
  const commune = await getCommuneBySlugCached(slug);
  return { title: commune ? `Mentions légales — ${commune.name}` : "Mentions légales" };
}

export default async function MentionsLegalesPage({ params }: Props) {
  const { "commune-slug": slug } = await params;
  const commune = await getCommuneBySlugCached(slug);
  if (!commune) notFound();

  return (
    <div className="prose prose-sm max-w-none">
      <h1 style={{ color: "var(--theme-primary)" }}>Mentions légales</h1>

      <h2>Éditeur du site</h2>
      <p>
        Commune de <strong>{commune.name}</strong>
        {commune.address && <><br />{commune.address}</>}
        {commune.phone && <><br />Téléphone : {commune.phone}</>}
        {commune.email && <><br />Email : {commune.email}</>}
      </p>
      <p>Directeur de la publication : Commune de {commune.name}</p>

      <h2>Hébergement</h2>
      <p>
        Ce site est hébergé par Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis.
        <br />Site web : <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">vercel.com</a>
      </p>

      <h2>Protection des données personnelles</h2>
      <p>
        Conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés,
        les données personnelles collectées sur ce site (nom, email, commune) sont traitées dans le seul but
        de fournir les services de la plateforme communautaire.
      </p>
      <p>
        Les données sont stockées de manière sécurisée par Supabase Inc. (hébergement UE).
        Aucune donnée n'est transmise à des tiers à des fins commerciales.
      </p>
      <p>
        Vous disposez d'un droit d'accès, de rectification et de suppression de vos données.
        Pour exercer ces droits, contactez la mairie à l'adresse indiquée ci-dessus
        {commune.email && <> ou par email à <a href={`mailto:${commune.email}`}>{commune.email}</a></>}.
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        L'ensemble du contenu de ce site (textes, images, logos) est la propriété de la commune de {commune.name}
        ou de ses contributeurs. Toute reproduction est interdite sans autorisation préalable.
      </p>

      <h2>Cookies</h2>
      <p>
        Ce site utilise uniquement des cookies techniques nécessaires au fonctionnement de l'authentification.
        Aucun cookie publicitaire ou de traçage n'est utilisé.
      </p>
    </div>
  );
}
