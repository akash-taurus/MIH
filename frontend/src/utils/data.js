export const NICHES = ["Fitness", "Tech", "Beauty", "Finance", "Food", "Gaming", "Travel", "Fashion"];
export const PLATFORMS = ["Instagram", "YouTube"];
export const platformColors = { Instagram: "#e1306c", YouTube: "#ff0000" };

function mkCreator(id, handle, niche, platform, followers, score) {
  const fake = Math.round((1 - score / 100) * 28 + 2);
  const eng = +(2 + (score / 100) * 7).toFixed(1);
  
  // Power Law pricing (kills the Linear Trap)
  const base = followers * 0.001;
  const scarcity = followers >= 50e6 ? 35 : followers >= 10e6 ? 8 : followers >= 1e6 ? 2.5 : 1;
  const geoWeight = followers > 20e6 ? 5.5 : 1;
  const trustFactor = Math.max(Math.pow(score / 50, 2), 0.25);
  const nicheMult = { Finance: 1.5, Tech: 1.5, Fitness: 1.2, Beauty: 1.2, Fashion: 1.1, Food: 1.0, Travel: 1.1, Gaming: 1.2 }[niche] || 1;
  const calibrated = base * scarcity * geoWeight * trustFactor * nicheMult;
  
  return {
    id, handle, niche, platform, followers,
    score, fake, eng,
    reach: Math.round(followers * (eng / 100) * 0.6),
    priceMin: Math.max(5000, Math.round(calibrated * 0.7 / 1000) * 1000),
    priceMax: Math.max(8000, Math.round(calibrated * 1.5 / 1000) * 1000),
    campaigns: Math.floor(Math.random() * 18 + 2),
    trust: score >= 80 ? "Elite" : score >= 65 ? "Verified" : "Moderate",
  };
}

export const ALL_CREATORS = [
  mkCreator(1,  "@rahulfit_",     "Fitness",  "Instagram",  142000, 87),
  mkCreator(2,  "@techbyte_in",   "Tech",     "YouTube",    298000, 79),
  mkCreator(3,  "@glambypriya",   "Beauty",   "Instagram",  87000,  93),
  mkCreator(4,  "@moneyminds",    "Finance",  "YouTube",    510000, 71),
  mkCreator(5,  "@kitchenkaran",  "Food",     "Instagram",  63000,  88),
  mkCreator(8,  "@luxelooks",     "Fashion",  "Instagram",  221000, 76),
  mkCreator(9,  "@wanderlust.ro", "Travel",   "Instagram",  118000, 91),
  mkCreator(10, "@gamezonein",    "Gaming",   "YouTube",    380000, 68),
  mkCreator(11, "@drskincare",    "Beauty",   "Instagram",  52000,  95),
  mkCreator(12, "@cryptopiyush",  "Finance",  "YouTube",    89000,  58),
  mkCreator(14, "@streetstyle_v", "Fashion",  "Instagram",  267000, 72),
  mkCreator(15, "@travelwala",    "Travel",   "YouTube",    143000, 80),
  mkCreator(17, "@codewithsam",   "Tech",     "YouTube",    195000, 83),
  mkCreator(19, "@gymrat_kr",     "Fitness",  "Instagram",  59000,  78),
  mkCreator(20, "@financeflow_",  "Finance",  "Instagram",  33000,  66),
];
