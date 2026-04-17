import Image from "next/image";
import Link from "next/link";

const features = [
  {
    emoji: "📢",
    title: "Communication officielle",
    body: "Annonces ciblées, événements, sondages. Modération intégrée et journal d'audit.",
    image: "/landing/05-admin.png",
  },
  {
    emoji: "🌐",
    title: "Site web inclus",
    body: "Bulletin municipal, conseil municipal, mentions légales — un site public clé-en-main par commune.",
    image: "/landing/06-public.png",
  },
  {
    emoji: "🎨",
    title: "Personnalisation",
    body: "Choisissez le thème, la couleur, le logo de votre commune. Votre identité, sans effort.",
    image: "/landing/07-arthez-feed.png",
  },
];

export function ForMairies() {
  return (
    <section id="mairies" className="relative overflow-hidden bg-gradient-to-br from-[#2a1a14] via-[#3a261c] to-[#2a1a14] px-6 py-24">
      <div className="absolute -top-32 -right-24 h-96 w-96 rounded-full bg-[#E49035]/10 blur-3xl" />
      <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-[#BF3328]/10 blur-3xl" />

      <div className="relative mx-auto max-w-6xl">
        <div className="text-center">
          <span className="inline-flex items-center rounded-full bg-[#E49035]/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#E49035]">
            Pour les mairies
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Une seule plateforme pour
            <br />
            <span className="bg-gradient-to-r from-[#E49035] to-[#D35230] bg-clip-text text-transparent">
              communiquer avec vos administrés.
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-white/70">
            Pensé pour des secrétariats à temps partiel. Aucune compétence technique requise.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur transition-all hover:bg-white/10"
            >
              <div className="flex-1 p-6">
                <div className="text-3xl">{f.emoji}</div>
                <h3 className="mt-3 text-lg font-bold text-white">{f.title}</h3>
                <p className="mt-2 text-sm text-white/70">{f.body}</p>
              </div>
              <div className="overflow-hidden border-t border-white/10 bg-white/5 px-6 pt-6">
                <Image
                  src={f.image}
                  alt={f.title}
                  width={500}
                  height={180}
                  className="rounded-t-md object-cover object-top"
                  style={{ height: "180px" }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-[#E49035]/30 bg-gradient-to-br from-[#BF3328]/20 to-[#D35230]/10 p-8 text-center backdrop-blur">
          <h3 className="text-xl font-semibold text-white">
            Démarrez en 10 minutes.
          </h3>
          <p className="mt-2 text-sm text-white/80">
            Inscription en ligne, validation par notre équipe, et vous publiez votre première annonce.
          </p>
          <Link
            href="/auth/register-commune"
            className="mt-5 inline-flex items-center justify-center rounded-lg bg-[#E49035] px-6 py-3 text-sm font-semibold text-[#2a1a14] shadow-lg transition-all hover:bg-[#FFA84A] hover:shadow-xl"
          >
            Inscrire ma mairie →
          </Link>
        </div>
      </div>
    </section>
  );
}
