import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const themedShowcases = [
  {
    name: "Saint-Médard",
    region: "Sud-Ouest",
    theme: "Terre d'Oc",
    color: "#D35230",
    image: "/landing/02-feed.png",
  },
  {
    name: "Arthez-de-Béarn",
    region: "Pyrénées",
    theme: "Alpin",
    color: "#1A5276",
    image: "/landing/07-arthez-feed.png",
  },
  {
    name: "Morlanne",
    region: "Béarn",
    theme: "Atlantique",
    color: "#2E9BC6",
    image: "/landing/08-morlanne-feed.png",
  },
];

export async function CommunesGrid() {
  const supabase = await createClient();
  const { data: communes } = await supabase
    .from("communes")
    .select("name, slug, code_postal")
    .order("created_at", { ascending: false })
    .limit(24);

  return (
    <section id="communes" className="bg-[#FBF7F1] px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[#2a1a14] sm:text-4xl">
            Chaque commune, <span className="text-[#D35230]">son identité.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-[#5a4030]">
            8 thèmes inspirés des régions de France. Personnalisez les couleurs, le logo, le ton.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {themedShowcases.map((c) => (
            <div
              key={c.name}
              className="overflow-hidden rounded-2xl border border-[#f0e0d0] bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="relative h-48 overflow-hidden">
                <Image
                  src={c.image}
                  alt={`Aperçu de ${c.name}`}
                  width={500}
                  height={300}
                  className="h-full w-full object-cover object-top"
                />
                <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/40 to-transparent" />
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-[#2a1a14]">{c.name}</h3>
                  <span className="text-xs text-[#7a5e4d]">{c.region}</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: c.color }}
                  />
                  <span className="text-xs text-[#5a4030]">Thème {c.theme}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {communes && communes.length > 0 && (
          <div className="mt-16">
            <h3 className="text-center text-sm font-semibold uppercase tracking-wider text-[#7a5e4d]">
              {communes.length} commune{communes.length > 1 ? "s" : ""} sur la plateforme
            </h3>
            <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {communes.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/${c.slug}`}
                    className="block rounded-lg border border-[#f0e0d0] bg-white px-4 py-3 text-center text-sm transition-all hover:border-[#D35230] hover:bg-[#FDF0EB]"
                  >
                    <div className="font-semibold text-[#2a1a14]">{c.name}</div>
                    {c.code_postal && (
                      <div className="text-xs text-[#7a5e4d]">{c.code_postal}</div>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
