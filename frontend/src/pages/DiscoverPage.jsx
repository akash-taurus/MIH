import { useState, useEffect, useMemo } from "react";
import { NICHES, PLATFORMS } from "../utils/data";
import { CreatorRow } from "../components/CreatorRow";
import { CreatorDetail } from "../components/CreatorDetail";
import { apiFetch } from "../utils/api";

export function DiscoverPage({ setPage, setCreatorData }) {
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState("");
  const [niche, setNiche] = useState("");
  const [sort, setSort] = useState("score");
  const [selectedCreator, setSelectedCreator] = useState(null);
  
  const [creators, setCreators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadCreators() {
      try {
        setLoading(true);
        const data = await apiFetch(`/api/frontend/creators?query=${search}&platform=${platform || "All"}&niche=${niche || "All"}&sortBy=${sort}`);
        setCreators(data.creators || []);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch creators:", err);
        setError("Unable to load creator network. Please ensure the backend is running.");
      } finally {
        setLoading(false);
      }
    }
    loadCreators();
  }, [search, platform, niche, sort]);

  const onCampaign = (c) => {
    setCreatorData(c);
    setPage("create-campaign");
  };

  return (
    <div style={{ display: "flex", height: "100vh", paddingTop: 56, overflow: "hidden" }}>
      
      {/* ── MAIN DISCOVERY AREA ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        
        {/* Header / Filters */}
        <div style={{ padding: "32px 40px 16px", flexShrink: 0 }}>
          <h1 style={{ 
            fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 800, 
            letterSpacing: "-.03em", marginBottom: 24 
          }}>
            Discovery <span style={{ color: "var(--primary)", fontWeight: 400 }}>/ Influencer Network</span>
          </h1>

          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
            <div className="search-wrap" style={{ flex: 1, maxWidth: 320 }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input 
                className="input" 
                placeholder="Search handles, niches..." 
                value={search} onChange={e => setSearch(e.target.value)}
              />
            </div>
            
            <select className="input" style={{ width: 140 }} value={platform} onChange={e => setPlatform(e.target.value)}>
              <option value="">All Platforms</option>
              {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            
            <select className="input" style={{ width: 140 }} value={niche} onChange={e => setNiche(e.target.value)}>
              <option value="">All Niches</option>
              {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="text-label" style={{ marginRight: 8 }}>Sort By</span>
            {[["score", "Auth Score"], ["reach", "Est. Reach"], ["followers", "Followers"]].map(([val, label]) => (
              <button 
                key={val} 
                className={`sort-pill ${sort === val ? "active" : ""}`}
                onClick={() => setSort(val)}
              >
                {label}
              </button>
            ))}
            <span style={{ marginLeft: "auto", fontSize: 13, color: "var(--ink2)", fontWeight: 500 }}>
              {creators.length} {creators.length === 1 ? "Creator" : "Creators"} found
            </span>
          </div>
        </div>

        {/* Table Header */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "36px 1fr 64px 90px 80px 72px 160px", 
          gap: 0, 
          padding: "12px 24px", 
          margin: "0 16px",
          borderBottom: "1px solid var(--ghost-border)",
          color: "var(--ink3)",
        }}>
          <span className="text-label" style={{ fontSize: 10 }}>Rank</span>
          <span className="text-label" style={{ fontSize: 10 }}>Creator</span>
          <span className="text-label" style={{ fontSize: 10 }}>Score</span>
          <span className="text-label" style={{ fontSize: 10 }}>Audience</span>
          <span className="text-label" style={{ fontSize: 10 }}>Reach</span>
          <span className="text-label" style={{ fontSize: 10 }}>Signal</span>
          <span className="text-label" style={{ fontSize: 10, textAlign: "right" }}>Baseline Pricing</span>
        </div>

        {/* Table Body */}
        <div className="anim-up" style={{ flex: 1, overflowY: "auto", padding: "8px 16px 40px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--ink3)" }}>
               Syncing with network...
            </div>
          ) : error ? (
            <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--error)" }}>
               {error}
            </div>
          ) : creators.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--ink3)" }}>
               No creators match your current filter constraints.
            </div>
          ) : (
            creators.map((c, i) => (
              <CreatorRow 
                key={c.id} c={c} rank={i + 1} 
                isSelected={selectedCreator?.id === c.id}
                onSelect={setSelectedCreator} 
              />
            ))
          )}
        </div>
      </div>

      {/* ── SIDE PANEL (Details) ── */}
      {selectedCreator && (
        <CreatorDetail 
          c={selectedCreator} 
          onClose={() => setSelectedCreator(null)}
          onCampaign={onCampaign}
        />
      )}
    </div>
  );
}
