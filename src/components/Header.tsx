import Link from "next/link";
import { SITE } from "@/lib/constants";
import { ButtonLink } from "@/components/ButtonLink";

const navItems = [
  { href: "/", label: "Inicio" },
  { href: "/apps", label: "Apps" },
  { href: "/cv", label: "CV" },
  { href: "/contacto", label: "Contacto" },
  { href: "/privado", label: "Privado" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/86 backdrop-blur">
      <div className="container-shell flex min-h-12 flex-row items-center justify-between gap-3 py-1.5 sm:min-h-16 sm:py-3">
        <Link className="focus-ring group inline-flex w-fit shrink-0 flex-col" href="/">
          <span className="text-sm font-bold text-[var(--ink)]">
            {SITE.name}
          </span>
          <span className="hidden text-xs text-[var(--muted)] sm:block">{SITE.domain}</span>
        </Link>
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <nav aria-label="Navegación principal" className="min-w-0 overflow-x-auto">
            <ul className="flex gap-0.5 rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-0.5 sm:gap-1 sm:p-1">
              {navItems.map((item) => (
                <li key={item.href} className="shrink-0">
                  <Link
                    className="focus-ring inline-flex min-h-8 items-center rounded-md px-2 text-xs font-semibold text-[var(--muted)] transition hover:bg-white hover:text-[var(--ink)] sm:min-h-9 sm:px-3 sm:text-sm"
                    href={item.href}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <ButtonLink href="/contacto" variant="primary">
            Contacto
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
