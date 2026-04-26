import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-gradient-to-b from-[#2a1a14] to-[#1a0e09] px-6 py-12 text-white/70">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#BF3328] via-[#D35230] to-[#E49035] text-base font-bold text-white">
                ◉
              </span>
              <span className="text-base font-bold tracking-tight text-white">Pretou</span>
            </div>
            <p className="mt-3 text-sm text-white/60">
              Conçu en France pour les communes rurales. Hébergement souverain, RGPD, open
              à toute mairie de moins de 2 000 habitants.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#E49035]">
              Pour commencer
            </h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link href="/auth/register-commune" className="hover:text-white">
                  Inscrire ma mairie
                </Link>
              </li>
              <li>
                <Link href="/auth/login" className="hover:text-white">
                  Se connecter
                </Link>
              </li>
              <li>
                <Link href="/auth/signup" className="hover:text-white">
                  Créer un compte résident
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#E49035]">
              Légal
            </h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link href="/mentions-legales" className="hover:text-white">
                  Mentions légales
                </Link>
              </li>
              <li>
                <Link href="/mentions-legales#rgpd" className="hover:text-white">
                  RGPD
                </Link>
              </li>
              <li>
                <a href="mailto:contact@example.fr" className="hover:text-white">
                  Nous contacter
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-white/40">
          © {new Date().getFullYear()} Pretou · Fait avec soin pour la France rurale 🇫🇷
        </div>
      </div>
    </footer>
  );
}
