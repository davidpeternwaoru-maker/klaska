// 404 page — friendly, on-brand, no internal detail.
export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-[520px] flex-col items-center justify-center px-6 text-center">
      <div className="font-display text-[44px] font-bold text-forest">404</div>
      <h1 className="mt-1 text-[18px] font-semibold text-ink">Page not found</h1>
      <p className="mt-1.5 text-[13.5px] text-ink-4">The page you&apos;re looking for doesn&apos;t exist or may have moved.</p>
      <a href="/" className="mt-5 flex h-10 items-center rounded-[var(--radius-card)] bg-forest px-5 text-[13px] font-semibold text-white transition hover:bg-forest-2">Go home</a>
    </div>
  );
}
