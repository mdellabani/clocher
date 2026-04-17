import Image from "next/image";

export function MobileSection() {
  return (
    <section className="bg-white px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <span className="inline-flex items-center rounded-full bg-[#FDF0EB] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#BF3328]">
              Mobile + Web
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#2a1a14] sm:text-4xl">
              Application mobile pour les habitants.
              <br />
              <span className="text-[#D35230]">Web pour le secrétariat.</span>
            </h2>
            <p className="mt-4 text-base text-[#5a4030]">
              Les habitants utilisent l'application sur iOS et Android — gratuite, légère,
              avec notifications push pour les annonces importantes. Le secrétariat de
              mairie pilote tout depuis un panneau web simple.
            </p>

            <ul className="mt-6 space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-[#D35230]">✓</span>
                <span className="text-[#2a1a14]">
                  <strong className="font-semibold">Notifications push</strong> pour les annonces et événements
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-[#D35230]">✓</span>
                <span className="text-[#2a1a14]">
                  <strong className="font-semibold">Hors-ligne</strong> — fil consultable sans connexion
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-[#D35230]">✓</span>
                <span className="text-[#2a1a14]">
                  <strong className="font-semibold">Mode admin de terrain</strong> pour publier depuis le mobile
                </span>
              </li>
            </ul>

            <div className="mt-8 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-2 rounded-lg border border-[#f0e0d0] bg-[#FBF7F1] px-4 py-2 text-sm text-[#5a4030]">
                <span className="text-base">🍎</span> App Store · bientôt
              </span>
              <span className="inline-flex items-center gap-2 rounded-lg border border-[#f0e0d0] bg-[#FBF7F1] px-4 py-2 text-sm text-[#5a4030]">
                <span className="text-base">🤖</span> Play Store · bientôt
              </span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#FDF0EB] via-[#F5DBC8] to-[#E49035]/30 blur-2xl" />
            <div className="relative mx-auto max-w-xs overflow-hidden rounded-3xl border-4 border-[#2a1a14] bg-[#2a1a14] shadow-2xl">
              <Image
                src="/landing/09-mobile.png"
                alt="Application mobile résident"
                width={400}
                height={800}
                className="w-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
