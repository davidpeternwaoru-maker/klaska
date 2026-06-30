/** Initials avatar with a deterministic soft brand-ish tint from a hue. */
export function Avatar({
  name,
  hue = 150,
  size = 32,
  ring = false,
}: {
  name: string;
  hue?: number;
  size?: number;
  ring?: boolean;
}) {
  const initials = name
    .replace(/^(Mrs|Mr|Ms|Dr)\.?\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <span
      className="inline-flex flex-none items-center justify-center rounded-full font-display font-bold"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.38),
        background: `hsl(${hue} 42% 92%)`,
        color: `hsl(${hue} 55% 32%)`,
        boxShadow: ring ? "0 0 0 2px #fff, 0 0 0 4px var(--color-forest)" : undefined,
      }}
    >
      {initials}
    </span>
  );
}
