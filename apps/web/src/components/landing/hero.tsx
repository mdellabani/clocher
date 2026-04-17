import Link from "next/link";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#FBF7F1] via-[#FDF0EB] to-[#F5DBC8]" />
      <div className="absolute -top-32 -right-24 h-96 w-96 rounded-full bg-gradient-to-br from-[#E49035]/40 to-[#D35230]/30 blur-3xl" />
      <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-gradient-to-tr from-[#BF3328]/20 to-[#E49035]/30 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#E49035]/30 bg-white/60 px-3 py-1 text-xs font-medium text-[#BF3328] backdrop-blur">
            🌾 Pensé pour les communes rurales de France
          </span>

          <h1 className="mt-6 text-4xl font-bold tracking-tight text-[#2a1a14] sm:text-6xl">
            Le village dans votre poche.
            <br />
            <span className="bg-gradient-to-r from-[#BF3328] via-[#D35230] to-[#E49035] bg-clip-text text-transparent">
              La mairie en direct.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg text-[#5a4030]">
            Une seule plateforme pour la mairie qui publie et les habitants qui reçoivent.
            Annonces, événements, entraide — tout dans une app simple et un site web inclus.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Link
              href="#communes"
              className="inline-flex w-full items-center justify-center rounded-lg bg-[#2a1a14] px-6 py-3 text-base font-semibold text-white shadow-lg transition-all hover:bg-[#3a261c] hover:shadow-xl sm:w-auto"
            >
              Voir si ma commune est inscrite
            </Link>
            <Link
              href="/auth/register-commune"
              className="inline-flex w-full items-center justify-center rounded-lg border border-[#D35230] bg-white px-6 py-3 text-base font-semibold text-[#BF3328] shadow-sm transition-all hover:bg-[#FDF0EB] hover:shadow sm:w-auto"
            >
              Inscrire ma mairie →
            </Link>
          </div>

          <p className="mt-6 text-xs text-[#7a5e4d]">
            Démarrage immédiat · Sans engagement · Hébergé en France
          </p>
        </div>
      </div>
    </section>
  );
}
