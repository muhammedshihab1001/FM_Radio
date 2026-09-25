/**
 * Runs `cb` once the current frame has been painted: requestAnimationFrame fires just
 * before a paint, and a task queued from it runs after that paint.
 */
export function afterFirstPaint(cb: () => void): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const frame = requestAnimationFrame(() => {
    timer = setTimeout(cb, 0);
  });
  return () => {
    cancelAnimationFrame(frame);
    if (timer !== undefined) clearTimeout(timer);
  };
}
