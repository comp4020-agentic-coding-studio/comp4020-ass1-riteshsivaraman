// The animation's state machine, as a pure function. No DOM, no rAF.
//
// The previous version drove the value from a cosine of elapsed time, which
// meant switching the animation on always snapped the control back to its
// minimum: the phase, not the position, was the state. Here the position *is*
// the state, so animating resumes from wherever the control currently sits and
// keeps travelling the way it was already going.

export type Direction = 1 | -1;

export type Sweep = {
  /** Where the control is now. */
  value: number;
  /** Which way it is heading. Reset to 1 when a person moves the control. */
  direction: Direction;
};

/**
 * Advance a sweep by `dtMs`, bouncing off both ends.
 *
 * @param periodMs time for a full out-and-back, so one traverse takes half.
 */
export function advance(
  sweep: Sweep,
  dtMs: number,
  min: number,
  max: number,
  periodMs: number,
): Sweep {
  const range = max - min;
  if (!(range > 0) || !(periodMs > 0) || !(dtMs > 0)) {
    return { value: clamp(sweep.value, min, max), direction: sweep.direction };
  }

  let value = clamp(sweep.value, min, max);
  let direction = sweep.direction;
  let remaining = (dtMs / (periodMs / 2)) * range;

  // Bounce repeatedly rather than once: a long frame gap — a background tab,
  // a slow device — can be worth more than a full traverse, and a single
  // reflection would leave the value outside the range.
  let guard = 0;
  while (remaining > 0 && guard++ < 64) {
    const room = direction === 1 ? max - value : value - min;
    if (remaining < room) {
      value += direction * remaining;
      remaining = 0;
    } else {
      value = direction === 1 ? max : min;
      remaining -= room;
      direction = direction === 1 ? -1 : 1;
    }
  }

  return { value: clamp(value, min, max), direction };
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}
