type SectionTitleProps = {
  eyebrow?: string;
  title: string;
  description?: string;
};

export function SectionTitle({
  eyebrow,
  title,
  description,
}: SectionTitleProps) {
  return (
    <div className="max-w-3xl">
      {eyebrow ? (
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-dark)]">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-2xl font-bold text-[var(--ink)] sm:text-3xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-3 text-base leading-7 text-[var(--muted)]">
          {description}
        </p>
      ) : null}
    </div>
  );
}
