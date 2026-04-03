export function fmtNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
}

/** Format INR values with Cr / L / K shorthand */
export function fmtINR(n) {
  if (n >= 10000000) return "₹" + (n / 10000000).toFixed(1) + " Cr";
  if (n >= 100000)   return "₹" + (n / 100000).toFixed(1) + " L";
  if (n >= 1000)     return "₹" + (n / 1000).toFixed(1) + "K";
  return "₹" + n.toLocaleString("en-IN");
}

/**
 * Power Law pricing engine (client-side).
 * Returns { post, reel, story, video } prices for both Instagram & YouTube.
 */
export function calcDeliverablePrices(followers, score, niche = "Lifestyle") {
  const base = followers * 0.001;
  const scarcity = followers >= 50e6 ? 35 : followers >= 10e6 ? 8 : followers >= 1e6 ? 2.5 : 1;
  const geoWeight = followers > 20e6 ? 5.5 : 1;
  const trustFactor = Math.max(Math.pow(score / 50, 2), 0.25);
  const nicheMult = { Finance: 1.5, Tech: 1.5, Fitness: 1.2, Beauty: 1.2, Fashion: 1.1, Food: 1.0, Travel: 1.1, Gaming: 1.2 }[niche] || 1.0;
  const calibrated = base * scarcity * geoWeight * trustFactor * nicheMult;

  // Platform-specific deliverable multipliers
  const instagram = {
    Post:  Math.max(5000, Math.round(calibrated * 0.5  / 1000) * 1000),
    Reel:  Math.max(6000, Math.round(calibrated * 1.0  / 1000) * 1000),
    Story: Math.max(3000, Math.round(calibrated * 0.4  / 1000) * 1000),
  };

  const youtube = {
    Post:   Math.max(4000, Math.round(calibrated * 0.4  / 1000) * 1000),   // Community post
    Short:  Math.max(6000, Math.round(calibrated * 0.6  / 1000) * 1000),   // YouTube Shorts
    Video:  Math.max(10000, Math.round(calibrated * 1.2 / 1000) * 1000),   // Dedicated video
  };

  return { instagram, youtube, baseCalibrated: calibrated };
}

/** Platform-specific deliverable options */
export const DELIVERABLES_BY_PLATFORM = {
  Instagram: ["Post", "Reel", "Story"],
  YouTube:   ["Post", "Short", "Video"],
};
