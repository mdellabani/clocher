import Image from "next/image";

const steps = [
  {
    badge: "Mairie",
    badgeColor: "bg-[#BF3328]",
    title: "1 publication",
    body: "Le secrétariat saisit l'annonce une seule fois depuis le panneau d'admin.",
    image: "/landing/05-admin.png",
    alt: "Panneau d'administration de la mairie",
  },
  {
    badge: "Résidents",
    badgeColor: "bg-[#D35230]",
    title: "Reçu sur mobile",
    body: "Les habitants la voient instantanément dans le fil et reçoivent une notification push.",
    image: "/landing/09-mobile.png",
    alt: "Application mobile résident",
  },
  {
    badge: "Site public",
    badgeColor: "bg-[#E49035]",
    title: "Visible sur le web",
    body: "L'annonce apparaît aussi sur le site public de la commune, accessible à tous.",
    image: "/landing/10-public-site.png",
    alt: "Site web public de la commune",
  },
];

export function HowItWorks() {
  return (
    <section className="bg-[#FBF7F1] px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[#2a1a14] sm:text-4xl">
            Une publication. <span className="text-[#D35230]">Trois destinations.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-[#5a4030]">
            Pas de gestion en triple. La mairie publie une fois — résidents et site web
            sont mis à jour ensemble, automatiquement.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {steps.map((step, idx) => (
            <div key={step.title} className="relative">
              {idx < steps.length - 1 && (
                <div className="pointer-events-none absolute left-full top-1/3 z-10 hidden h-px w-8 -translate-x-4 md:block">
                  <div className="h-full w-full bg-gradient-to-r from-[#D35230]/40 to-[#D35230]/0" />
                  <span className="absolute -top-2 right-0 text-[#D35230]">→</span>
                </div>
              )}
              <div className="relative overflow-hidden rounded-2xl border border-[#f0e0d0] bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                <span
                  className={`inline-flex items-center rounded-full ${step.badgeColor} px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white`}
                >
                  {step.badge}
                </span>
                <h3 className="mt-4 text-lg font-bold text-[#2a1a14]">{step.title}</h3>
                <p className="mt-2 text-sm text-[#5a4030]">{step.body}</p>
                <div className="mt-5 overflow-hidden rounded-lg border border-[#f0e0d0] bg-[#FBF7F1]">
                  <Image
                    src={step.image}
                    alt={step.alt}
                    width={400}
                    height={280}
                    className="w-full object-cover"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
