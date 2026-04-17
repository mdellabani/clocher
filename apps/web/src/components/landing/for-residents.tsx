import Image from "next/image";
import Link from "next/link";

const features = [
  {
    emoji: "📰",
    title: "Le fil du village",
    body: "Annonces officielles, petites annonces, événements, demandes d'entraide — tout dans un fil simple.",
    image: "/landing/02-feed.png",
  },
  {
    emoji: "🗓️",
    title: "Événements & RSVP",
    body: "Marchés, conseils municipaux, fêtes du village. Confirmez votre présence en un clic.",
    image: "/landing/04-evenements.png",
  },
  {
    emoji: "🥕",
    title: "Producteurs locaux",
    body: "Annuaire des producteurs et artisans de la commune. Acheter local, c'est plus rapide.",
    image: "/landing/02-feed.png",
  },
];

export function ForResidents() {
  return (
    <section id="residents" className="bg-white px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <span className="inline-flex items-center rounded-full bg-[#FDF0EB] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#BF3328]">
            Pour les résidents
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#2a1a14] sm:text-4xl">
            Tout ce qui se passe au village,
            <br />
            <span className="text-[#D35230]">au creux de votre main.</span>
          </h2>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group flex flex-col overflow-hidden rounded-2xl border border-[#f0e0d0] bg-[#FBF7F1] transition-all hover:shadow-lg"
            >
              <div className="flex-1 p-6">
                <div className="text-3xl">{f.emoji}</div>
                <h3 className="mt-3 text-lg font-bold text-[#2a1a14]">{f.title}</h3>
                <p className="mt-2 text-sm text-[#5a4030]">{f.body}</p>
              </div>
              <div className="overflow-hidden border-t border-[#f0e0d0] bg-white px-6 pt-6">
                <Image
                  src={f.image}
                  alt={f.title}
                  width={500}
                  height={200}
                  className="rounded-t-md object-cover object-top transition-transform group-hover:-translate-y-1"
                  style={{ height: "180px" }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-[#f0e0d0] bg-gradient-to-br from-[#FDF0EB] to-[#FBF7F1] p-8 text-center">
          <h3 className="text-xl font-semibold text-[#2a1a14]">
            Votre commune utilise déjà la plateforme&nbsp;?
          </h3>
          <p className="mt-2 text-sm text-[#5a4030]">
            Demandez le code d'invitation au secrétariat de votre mairie.
          </p>
          <Link
            href="/auth/login"
            className="mt-5 inline-flex items-center justify-center rounded-lg bg-[#D35230] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#BF3328] hover:shadow"
          >
            Se connecter →
          </Link>
        </div>
      </div>
    </section>
  );
}
