/** Zero unless `value` is a real number past `threshold`.
 *
 * Used to settle parallax input: raw deviceorientation jitters by fractions of
 * a degree even on a stationary table, so without a deadband the effect never
 * comes fully to rest.
 *
 * The NaN check is load-bearing, not defensive. useMouseInElement reports a 0x0
 * element until the first mousemove, so useParallax divides by a zero height
 * and hands back NaN; feeding that to useTransition latches it, because the
 * tween then interpolates from NaN and never recovers. Note that a bare
 * magnitude test lets NaN straight through — `Math.abs(NaN) > threshold` is
 * false, so it returns the NaN rather than the zero you meant.
 */
export function deadband(value, threshold) {
    return Number.isFinite(value) && Math.abs(value) > threshold ? value : 0;
}
