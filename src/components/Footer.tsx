import Link from "next/link";
import { CONTACT, LINKS, SITE } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="border-t border-[var(--line)] bg-white/70">
      <div className="container-shell flex flex-col gap-4 py-8 text-sm text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} {SITE.name}</p>
        <div className="flex flex-wrap gap-4">
          <Link className="focus-ring hover:text-[var(--accent-dark)]" href={LINKS.linkedin}>
            LinkedIn
          </Link>
          <Link className="focus-ring hover:text-[var(--accent-dark)]" href={LINKS.email}>
            {CONTACT.primaryEmail}
          </Link>
          <Link className="focus-ring hover:text-[var(--accent-dark)]" href={LINKS.phone}>
            {CONTACT.phoneDisplay}
          </Link>
          <Link className="focus-ring hover:text-[var(--accent-dark)]" href="/">
            {SITE.domain}
          </Link>
        </div>
      </div>
    </footer>
  );
}
