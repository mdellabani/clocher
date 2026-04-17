"use client";

import { useState } from "react";

const items = [
  {
    q: "Combien ça coûte ?",
    a: "La plateforme est en phase pilote. Contactez-nous pour discuter d'un abonnement adapté à la taille de votre commune.",
  },
  {
    q: "Mes données sont-elles protégées ?",
    a: "Oui. Hébergement en France, conformité RGPD, et chaque commune ne voit que ses propres données. Aucune revente d'informations.",
  },
  {
    q: "Qui modère les contenus ?",
    a: "Chaque mairie a accès à des outils de modération : signalement par les habitants, filtres de mots-clés, masquage automatique au-delà de 3 signalements. Le secrétariat garde le contrôle.",
  },
  {
    q: "Comment démarrer ?",
    a: "Inscrivez votre commune en ligne (5 minutes). Notre équipe valide la demande sous 48h. Vous recevez un code d'invitation à distribuer aux habitants. C'est tout.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="bg-[#FBF7F1] px-6 py-24">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[#2a1a14] sm:text-4xl">
            Questions fréquentes
          </h2>
        </div>

        <ul className="mt-12 space-y-3">
          {items.map((item, i) => {
            const isOpen = open === i;
            return (
              <li
                key={item.q}
                className="overflow-hidden rounded-xl border border-[#f0e0d0] bg-white transition-shadow hover:shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="text-base font-semibold text-[#2a1a14]">{item.q}</span>
                  <span
                    className={`text-xl text-[#D35230] transition-transform ${
                      isOpen ? "rotate-45" : ""
                    }`}
                  >
                    +
                  </span>
                </button>
                {isOpen && (
                  <div className="border-t border-[#f0e0d0] px-5 py-4 text-sm text-[#5a4030]">
                    {item.a}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
