import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCommuneBySlug } from "@rural-community-platform/shared";
import { ThemeInjector } from "@/components/theme-injector";
import { Phone, Mail, MapPin, Clock, ExternalLink } from "lucide-react";

type Props = {
  params: Promise<{ "commune-slug": string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { "commune-slug": slug } = await params;
  const supabase = await createClient();
  const { data: commune } = await getCommuneBySlug(supabase, slug);

  return {
    title: commune ? `Infos pratiques — ${commune.name}` : "Infos pratiques",
  };
}

interface InfosPratiques {
  horaires?: string;
  contact?: string;
  services?: string;
  associations?: string;
  commerces?: Array<{ nom: string; horaires?: string; tel?: string; emoji?: string }>;
  liens?: string;
}

interface ContactInfo {
  tel?: string;
  email?: string;
  adresse?: string;
}

interface Service {
  name: string;
  location?: string;
  phone: string;
}

interface Lien {
  label: string;
  url: string;
}

function parseContact(contactStr?: string): ContactInfo {
  if (!contactStr) return {};
  const result: ContactInfo = {};
  const lines = contactStr.split("\n");
  for (const line of lines) {
    if (/tél/i.test(line)) {
      const match = line.match(/tél\s*:\s*(.+)$/i);
      if (match) result.tel = match[1].trim();
    } else if (/email/i.test(line)) {
      const match = line.match(/email\s*:\s*(.+)$/i);
      if (match) result.email = match[1].trim();
    } else if (/adresse/i.test(line)) {
      const match = line.match(/adresse\s*:\s*(.+)$/i);
      if (match) result.adresse = match[1].trim();
    }
  }
  return result;
}

function parseServices(servicesStr?: string): Service[] {
  if (!servicesStr) return [];
  const lines = servicesStr.split("\n").filter((l) => l.trim());
  const regex = /^(.+?)(?:\s*\((.+?)\))?\s*:\s*(.+)$/;
  return lines
    .map((line) => {
      const match = line.match(regex);
      if (!match) return null;
      return { name: match[1].trim(), location: match[2]?.trim(), phone: match[3].trim() };
    })
    .filter((s): s is Service => s !== null);
}

function parseAssociations(assocStr?: string): Array<{ name: string; description: string }> {
  if (!assocStr) return [];
  const lines = assocStr.split("\n").filter((l) => l.trim());
  return lines.map((line) => {
    const parts = line.split(/\s*—\s*/);
    return { name: parts[0].trim(), description: parts[1]?.trim() || "" };
  });
}

function parseLinks(linksStr?: string): Lien[] {
  if (!linksStr) return [];
  const lines = linksStr.split("\n").filter((l) => l.trim());
  return lines
    .map((line) => {
      const match = line.match(/^(.+?)\s*:\s*(.+)$/);
      if (!match) return null;
      const url = match[2].trim();
      if (url.match(/^https?:\/\//)) {
        return { label: match[1].trim(), url };
      }
      return null;
    })
    .filter((l): l is Lien => l !== null);
}

function parseHours(hoursStr?: string): string[] {
  if (!hoursStr) return [];
  return hoursStr.split("\n").filter((l) => l.trim());
}

export default async function InfosPratiquesPage({ params }: Props) {
  const { "commune-slug": slug } = await params;

  const supabase = await createClient();
  const { data: commune } = await getCommuneBySlug(supabase, slug);

  if (!commune) {
    notFound();
  }

  const infos = (commune.infos_pratiques ?? {}) as InfosPratiques;
  const contact = parseContact(infos.contact);
  const services = parseServices(infos.services);
  const associations = parseAssociations(infos.associations);
  const commerces = infos.commerces ?? [];
  const links = parseLinks(infos.liens);
  const hours = parseHours(infos.horaires);

  return (
    <div className="space-y-6">
      <ThemeInjector theme={commune.theme} />

      <h1 className="text-2xl font-semibold text-[var(--foreground)]">
        Infos pratiques — {commune.name}
      </h1>

      {/* Mairie Hero Card */}
      {(hours.length > 0 || contact.tel || contact.email || contact.adresse) && (
        <div
          className="rounded-[14px] border border-[#f0e8da] p-6 shadow-[0_2px_8px_rgba(140,120,80,0.08)]"
          style={{
            background: `linear-gradient(135deg, var(--theme-gradient-1) 0%, var(--theme-gradient-2) 50%, var(--theme-gradient-3) 100%)`,
          }}
        >
          <div className="flex flex-col gap-6 text-white sm:flex-row sm:justify-between">
            {hours.length > 0 && (
              <div className="flex-1">
                <div className="mb-3 flex items-center gap-2">
                  <Clock size={20} />
                  <h2 className="text-lg font-semibold">{commune.name}</h2>
                </div>
                <div className="space-y-1 text-sm">
                  {hours.map((hour, idx) => (
                    <div key={idx}>{hour}</div>
                  ))}
                </div>
              </div>
            )}

            {(contact.tel || contact.email || contact.adresse) && (
              <div className="flex-1 space-y-3 text-sm">
                {contact.tel && (
                  <div className="flex items-center gap-2">
                    <Phone size={16} />
                    <a href={`tel:${contact.tel.replace(/\s/g, "")}`} className="underline hover:opacity-80">
                      {contact.tel}
                    </a>
                  </div>
                )}
                {contact.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={16} />
                    <a href={`mailto:${contact.email}`} className="underline hover:opacity-80">
                      {contact.email}
                    </a>
                  </div>
                )}
                {contact.adresse && (
                  <div className="flex items-start gap-2">
                    <MapPin size={16} className="mt-0.5 flex-shrink-0" />
                    <span>{contact.adresse}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Services de proximité */}
      {services.length > 0 && (
        <div className="rounded-[14px] border border-[#f0e8da] bg-white p-5 shadow-[0_2px_8px_rgba(140,120,80,0.08)]">
          <h2
            className="mb-4 flex items-center gap-2 text-lg font-semibold"
            style={{ color: "var(--theme-primary)" }}
          >
            📍 Services de proximité
          </h2>
          <div className="space-y-3">
            {services.map((service, idx) => (
              <div
                key={idx}
                className="rounded-lg p-3"
                style={{ backgroundColor: "var(--theme-background)" }}
              >
                <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
                  <div className="flex-1">
                    <div className="font-semibold text-[var(--foreground)]">{service.name}</div>
                    {service.location && (
                      <div className="text-sm text-[var(--muted-foreground)]">{service.location}</div>
                    )}
                  </div>
                  <a
                    href={`tel:${service.phone.replace(/\s/g, "")}`}
                    className="text-sm font-medium whitespace-nowrap"
                    style={{ color: "var(--theme-primary)" }}
                  >
                    {service.phone}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Associations */}
      {associations.length > 0 && (
        <div className="rounded-[14px] border border-[#f0e8da] bg-white p-5 shadow-[0_2px_8px_rgba(140,120,80,0.08)]">
          <h2
            className="mb-4 flex items-center gap-2 text-lg font-semibold"
            style={{ color: "var(--theme-primary)" }}
          >
            🤝 Associations
          </h2>
          <div className="flex flex-wrap gap-3">
            {associations.map((assoc, idx) => (
              <div
                key={idx}
                className="rounded-full px-4 py-2 text-sm font-medium"
                style={{
                  backgroundColor: "var(--theme-pin-bg)",
                  color: "var(--theme-primary)",
                }}
                title={assoc.description}
              >
                {assoc.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Commerces & services */}
      {commerces.length > 0 && (
        <div className="rounded-[14px] border border-[#f0e8da] bg-white p-5 shadow-[0_2px_8px_rgba(140,120,80,0.08)]">
          <h2
            className="mb-4 flex items-center gap-2 text-lg font-semibold"
            style={{ color: "var(--theme-primary)" }}
          >
            🏪 Commerces & services
          </h2>
          <div className="space-y-3">
            {commerces.map((commerce, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 rounded-lg p-3"
                style={{ backgroundColor: "var(--theme-background)" }}
              >
                {commerce.emoji && (
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white text-lg">
                    {commerce.emoji}
                  </div>
                )}
                <div className="flex-1">
                  <div className="font-semibold text-[var(--foreground)]">{commerce.nom}</div>
                  {commerce.horaires && (
                    <div className="text-sm text-[var(--muted-foreground)]">{commerce.horaires}</div>
                  )}
                  {commerce.tel && (
                    <a
                      href={`tel:${commerce.tel.replace(/\s/g, "")}`}
                      className="text-sm font-medium"
                      style={{ color: "var(--theme-primary)" }}
                    >
                      {commerce.tel}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Liens utiles */}
      {links.length > 0 && (
        <div className="rounded-[14px] border border-[#f0e8da] bg-white p-5 shadow-[0_2px_8px_rgba(140,120,80,0.08)]">
          <h2
            className="mb-4 flex items-center gap-2 text-lg font-semibold"
            style={{ color: "var(--theme-primary)" }}
          >
            🔗 Liens utiles
          </h2>
          <div className="space-y-2">
            {links.map((link, idx) => (
              <a
                key={idx}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg p-3 text-sm transition-colors"
                style={{
                  backgroundColor: "var(--theme-background)",
                  color: "var(--theme-primary)",
                }}
              >
                <span className="flex-1 font-medium hover:underline">{link.label}</span>
                <ExternalLink size={16} className="flex-shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {hours.length === 0 &&
        services.length === 0 &&
        associations.length === 0 &&
        commerces.length === 0 &&
        links.length === 0 && (
          <p className="text-sm text-[var(--muted-foreground)]">
            Aucune information pratique disponible pour le moment.
          </p>
        )}
    </div>
  );
}
