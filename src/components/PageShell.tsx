type PageShellProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
};

export function PageShell({
  eyebrow,
  title,
  description,
  children,
}: PageShellProps) {
  return (
    <div className="container-shell py-12 sm:py-16">
      <div className="max-w-3xl">
        {eyebrow ? (
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-dark)]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-4xl font-bold text-[var(--ink)] sm:text-5xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-5 text-lg leading-8 text-[var(--muted)]">
            {description}
          </p>
        ) : null}
      </div>
      <div className="mt-10">{children}</div>
    </div>
  );
}
