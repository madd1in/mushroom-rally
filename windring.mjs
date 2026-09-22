// A visual precision reward; existing ring contact and jump physics stay unchanged.
export function isPrecisionFlight(racer, ring) {
  if (ring.ag || !racer.air || !racer.glideArmed || racer.stun > 0 || (racer.gliderOpen || 0) < .55) return false;
  const lateral = racer.offset - ring.off;
  const vertical = racer.y + .9 - ring.y;
  return Number.isFinite(lateral) && Number.isFinite(vertical) && Math.hypot(lateral, vertical) <= 1.35;
}

export function ringBoostDuration(precision) { return precision ? 1.55 : 1.3; }
