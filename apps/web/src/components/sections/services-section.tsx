import { createClient } from "@/lib/supabase/server";
import { Phone, Mail, MapPin, Clock } from "lucide-react";

export async function ServicesSection({ communeId }: { communeId: string }) {
  const supabase = await createClient();
  const { data: commune } = await supabase
    .from("communes")
    .select("name, phone, email, address, opening_hours")
    .eq("id", communeId)
    .single();

  if (!commune) return null;

  const hasContact = commune.phone || commune.email || commune.address;
  const hours = Object.entries((commune.opening_hours ?? {}) as Record<string, string>)
    .filter(([, v]) => v.trim());

  if (!hasContact && hours.length === 0) return null;

  return (
    <section className="rounded-[14px] p-6 shadow-[0_2px_8px_rgba(140,120,80,0.08)]" style={{
      background: "linear-gradient(135deg, var(--theme-gradient-1), var(--theme-gradient-2), var(--theme-gradient-3))"
    }}>
      <div className="flex flex-col gap-6 text-white sm:flex-row sm:justify-between">
        {hours.length > 0 && (
          <div className="flex-1">
            <div className="mb-3 flex items-center gap-2">
              <Clock size={18} />
              <h2 className="text-lg font-semibold">{commune.name}</h2>
            </div>
            <div className="space-y-1 text-sm">
              {hours.map(([day, time]) => (
                <div key={day}>{day.charAt(0).toUpperCase() + day.slice(1)} : {time}</div>
              ))}
            </div>
          </div>
        )}
        {hasContact && (
          <div className="flex-1 space-y-3 text-sm">
            {commune.phone && (
              <div className="flex items-center gap-2">
                <Phone size={16} />
                <a href={`tel:${commune.phone.replace(/\s/g, "")}`} className="underline hover:opacity-80">
                  {commune.phone}
                </a>
              </div>
            )}
            {commune.email && (
              <div className="flex items-center gap-2">
                <Mail size={16} />
                <a href={`mailto:${commune.email}`} className="underline hover:opacity-80">
                  {commune.email}
                </a>
              </div>
            )}
            {commune.address && (
              <div className="flex items-start gap-2">
                <MapPin size={16} className="mt-0.5 shrink-0" />
                <span>{commune.address}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
