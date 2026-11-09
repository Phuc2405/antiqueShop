// React giả tối thiểu cho useCartSync: 1 component, chạy effect khi deps đổi.
type Slot = { deps?: unknown[]; cleanup?: void | (() => void) };
const slots: Slot[] = [];
let cursor = 0;
export function __beginRender() {
  cursor = 0;
}
export function __unmount() {
  for (const s of slots) if (typeof s.cleanup === 'function') s.cleanup();
  slots.length = 0;
}
export function useEffect(fn: () => void | (() => void), deps?: unknown[]) {
  const i = cursor++;
  const prev = slots[i];
  const changed = !prev || !deps || !prev.deps || deps.some((d, k) => !Object.is(d, prev.deps![k]));
  if (!changed) return;
  if (prev && typeof prev.cleanup === 'function') prev.cleanup();
  slots[i] = { deps, cleanup: fn() };
}
export function useState<T>(v: T) {
  return [v, () => {}] as const;
}
export default { useEffect, useState };
