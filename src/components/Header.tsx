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
      <div className="container-shell flex min-h-16 flex-col justify-center gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <Link className="focus-ring group inline-flex w-fit flex-col" href="/">
          <span className="text-sm font-bold text-[var(--ink)]">
            {SITE.name}
          </span>
          <span className="text-xs text-[var(--muted)]">{SITE.domain}</span>
        </Link>
        <div className="flex items-center gap-3">
          <nav aria-label="Navegación principal">
            <ul className="flex flex-wrap gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-1">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    className="focus-ring inline-flex min-h-9 items-center rounded-md px-3 text-sm font-semibold text-[var(--muted)] transition hover:bg-white hover:text-[var(--ink)]"
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
