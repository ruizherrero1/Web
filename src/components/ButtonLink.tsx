import Link from "next/link";

type ButtonLinkProps = {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
};

const variants = {
  primary:
    "bg-[var(--accent-strong)] text-[var(--on-accent)] border-[var(--accent-strong)] hover:bg-[var(--accent)]",
  secondary:
    "bg-[var(--surface)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]",
  ghost:
    "bg-transparent text-[var(--accent-dark)] border-transparent hover:bg-[var(--surface-strong)]",
};

export function ButtonLink({
  href,
  children,
  variant = "secondary",
}: ButtonLinkProps) {
  return (
    <Link
      className={`focus-ring inline-flex min-h-11 items-center justify-center rounded-md border px-4 py-2 text-sm font-semibold transition ${variants[variant]}`}
      href={href}
    >
      {children}
    </Link>
  );
}
