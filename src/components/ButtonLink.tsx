import Link from "next/link";

type ButtonLinkProps = {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
};

const variants = {
  primary:
    "bg-[var(--accent-dark)] text-white border-[var(--accent-dark)] hover:bg-[var(--accent)]",
  secondary:
    "bg-white text-[var(--ink)] border-[var(--line)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]",
  ghost:
    "bg-transparent text-[var(--accent-dark)] border-transparent hover:bg-white/70",
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
