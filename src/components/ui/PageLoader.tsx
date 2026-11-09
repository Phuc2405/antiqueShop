export function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Đang tải">
      <span className="font-serif text-lg text-ink-soft animate-pulse">Đang lật trang…</span>
    </div>
  );
}
