import { useState, useMemo, useEffect } from "react";
import { calcDeliverablePrices, DELIVERABLES_BY_PLATFORM, fmtINR } from "../utils/format";
import { ALL_CREATORS } from "../utils/data";
import { createCampaignOnChain, depositFundsOnChain } from "../utils/blockchain";
import { apiFetch } from "../utils/api";

export function CreateCampaign({ setPage, creatorData, setCampaignId }) {
  const creator = creatorData || ALL_CREATORS[0];
  const [platform, setPlatform] = useState(creator.platform || "Instagram");
  const dtypes = DELIVERABLES_BY_PLATFORM[platform] || [];
  const [deliverables, setDeliverables] = useState(dtypes.reduce((acc, d) => ({ ...acc, [d]: 0 }), {}));
  
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [paymentMode, setPaymentMode] = useState("Milestones");
  const [isLaunching, setIsLaunching] = useState(false);
  const [error, setError] = useState(null);
  const [extraMilestones, setExtraMilestones] = useState([]); // [{id, title, amount}]
  
  const prices = useMemo(() => calcDeliverablePrices(creator.followers, creator.score, creator.niche), [creator]);
  const platPrices = platform === "YouTube" ? prices.youtube : prices.instagram;

  const total = useMemo(() => {
    const deliverablesSum = Object.entries(deliverables).reduce((sum, [type, count]) => {
      const price = platPrices[type] || 0;
      return sum + (count * price);
    }, 0);
    const extraSum = extraMilestones.reduce((sum, m) => sum + Number(m.amount || 0), 0);
    return deliverablesSum + extraSum;
  }, [deliverables, platPrices, extraMilestones]);

  const updateCount = (type, delta) => {
    setDeliverables(prev => ({ ...prev, [type]: Math.max(0, (prev[type] || 0) + delta) }));
  };

  const handlePlatformSwitch = (newPlatform) => {
    setPlatform(newPlatform);
    const newDtypes = DELIVERABLES_BY_PLATFORM[newPlatform] || [];
    setDeliverables(newDtypes.reduce((acc, d) => ({ ...acc, [d]: 0 }), {}));
  };

  const launch = async () => {
    if (!title) { setError("Campaign name is required"); return; }
    try {
      setIsLaunching(true);
      setError(null);

      // 1. Prepare milestones for BOTH blockchain and frontend tracking
      const ethConversion = 0.00001; 
      const selected = Object.entries(deliverables).filter(([_, count]) => count > 0);
      
      let blockchainMilestones = [];
      let frontendMilestones = [];

      if (paymentMode === "Full") {
        blockchainMilestones = [{
          description: "Full Campaign Completion",
          requiredAction: "all",
          targetValue: 1,
          paymentAmount: (total * ethConversion).toFixed(6),
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }];
        frontendMilestones = [{
          id: "1",
          title: "Final completion and release",
          amount: fmtINR(total),
          status: "Pending",
          deadline: "Oct 2026"
        }];
      } else {
        blockchainMilestones = selected.map(([type, count]) => ({
          description: `${count}x ${type}`,
          requiredAction: type,
          targetValue: count,
          paymentAmount: (count * (platPrices[type] || 0) * ethConversion).toFixed(6),
          deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        }));
        
        // Add all extra milestones
        extraMilestones.forEach(m => {
          blockchainMilestones.push({
            description: m.title,
            requiredAction: "custom",
            targetValue: 1,
            paymentAmount: (m.amount * ethConversion).toFixed(6),
            deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString()
          });
        });

        frontendMilestones = [
          ...selected.map(([type, count], idx) => ({
            id: (idx + 1).toString(),
            title: `${count}x ${type}`,
            amount: fmtINR(count * (platPrices[type] || 0)),
            status: "Pending",
            deadline: "Oct 2026"
          })),
          ...extraMilestones.map(m => ({
            id: m.id,
            title: m.title,
            amount: fmtINR(m.amount),
            status: "Pending",
            deadline: "Dec 2026"
          }))
        ];
      }

      const totalBudgetEth = (total * ethConversion).toFixed(6);

      // 2. Create on blockchain
      console.log("Creating campaign on chain...");
      const { txHash, onChainId } = await createCampaignOnChain(
        creator.wallet || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", 
        totalBudgetEth,
        blockchainMilestones
      );

      // 3. Deposit funds
      console.log("Depositing funds for campaign", onChainId);
      await depositFundsOnChain(onChainId, totalBudgetEth);

      // 4. Notify backend
      console.log("Syncing with backend...");
      const campaign = await apiFetch("/api/frontend/campaigns", {
        method: "POST",
        body: {
          brand: "Brand Admin",
          creator: creator.handle,
          type: title,
          budget: total,
          creatorData: {
             score: creator.score,
             platform: creator.platform
          },
          blockchainData: {
            txHash: txHash,
            onChainId: onChainId
          },
          milestones: frontendMilestones,
          brief: brief
        }
      });

      setCampaignId(campaign.id);
      setPage("campaigns");
    } catch (err) {
      console.error("Launch failed:", err);
      setError(err.message || "Failed to launch campaign. Check console for details.");
    } finally {
      setIsLaunching(false);
    }
  };

  const [predictedReach, setPredictedReach] = useState(0);

  useEffect(() => {
    const selected = Object.entries(deliverables).filter(([_, count]) => count > 0);
    if (selected.length === 0) {
      setPredictedReach(0);
      return;
    }
    
    const timeoutId = setTimeout(async () => {
      try {
        const payload = {
          platform,
          followerCount: creator.followers || 0,
          authenticityScore: creator.score || 80,
          deliverables: selected.map(([format, count]) => ({ format, count }))
        };
        const res = await apiFetch("/api/frontend/reach", {
           method: "POST",
           body: JSON.stringify(payload)
        });
        if (res && res.totalPredictedReach !== undefined) {
           setPredictedReach(res.totalPredictedReach);
        }
      } catch (err) {
        console.error("Reach ML service connection failed", err);
      }
    }, 400); // 400ms debounce
    
    return () => clearTimeout(timeoutId);
  }, [deliverables, platform, creator]);


  return (
    <div style={{ marginTop: 56, maxWidth: 960, margin: "56px auto 0", padding: "40px 28px 48px" }}>
      
      <div className="anim-up" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40 }}>
        <div>
          <div className="text-label" style={{ marginBottom: 6 }}>ORCHESTRATION ENGINE</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 800, letterSpacing: "-.02em" }}>
            Draft Campaign <span style={{ color: "var(--primary-dim)", fontWeight: 400 }}>/ {creator.handle}</span>
          </h1>
        </div>
        <button className="btn-secondary" onClick={() => setPage("discover")}>← Cancel Draft</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 32 }}>
        
        {/* ── Left: Campaign Builder ── */}
        <div className="anim-up-1" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          
          <div className="panel" style={{ padding: 28 }}>
            <div className="text-label" style={{ marginBottom: 20 }}>Core Metadata</div>
            
            <div style={{ marginBottom: 20 }}>
              <label className="text-label" style={{ display: "block", marginBottom: 8, color: "var(--ink)" }}>Campaign Name</label>
              <input 
                className="input" placeholder="e.g. Neon Genesis Q4 Launch" 
                value={title} onChange={e => setTitle(e.target.value)} 
                style={{ fontSize: 16, padding: "14px 16px" }}
              />
            </div>
            
            <div>
              <label className="text-label" style={{ display: "block", marginBottom: 8, color: "var(--ink)" }}>Strategic Brief & Guidelines</label>
              <textarea 
                 className="input" 
                 placeholder="Describe the aesthetic requirements, key talking points, and non-negotiables..."
                 value={brief} onChange={e => setBrief(e.target.value)}
                 style={{ minHeight: 120, resize: "vertical", lineHeight: 1.6 }}
              />
            </div>
          </div>

          <div className="panel" style={{ padding: 28 }}>
            <div className="text-label" style={{ marginBottom: 20 }}>Payment Structure</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <button 
                onClick={() => setPaymentMode("Full")} 
                style={{
                  background: paymentMode === "Full" ? "var(--primary-raw)" : "var(--surface-container-high)",
                  color: paymentMode === "Full" ? "#fff" : "var(--ink2)",
                  border: "1px solid var(--ghost-border)", borderRadius: 8, padding: "16px",
                  fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all .2s"
                }}
              >
                <div style={{ fontSize: 18, marginBottom: 4 }}>📦</div>
                Single Payment
                <div style={{ fontSize: 10, fontWeight: 400, opacity: 0.8, marginTop: 4 }}>Release full funds after completion</div>
              </button>
              <button 
                onClick={() => setPaymentMode("Milestones")} 
                style={{
                  background: paymentMode === "Milestones" ? "var(--primary-raw)" : "var(--surface-container-high)",
                  color: paymentMode === "Milestones" ? "#fff" : "var(--ink2)",
                  border: "1px solid var(--ghost-border)", borderRadius: 8, padding: "16px",
                  fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all .2s"
                }}
              >
                <div style={{ fontSize: 18, marginBottom: 4 }}>🗺️</div>
                Milestone Split
                <div style={{ fontSize: 10, fontWeight: 400, opacity: 0.8, marginTop: 4 }}>Pay per deliverable verified</div>
              </button>
            </div>
          </div>

          <div className="panel" style={{ padding: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div className="text-label">Deliverable Assembly</div>
              
              <div style={{ display: "flex", background: "var(--surface-container-high)", borderRadius: 6, padding: 3 }}>
                {["Instagram", "YouTube"].map(p => (
                  <button key={p} onClick={() => handlePlatformSwitch(p)} style={{
                    background: platform === p ? "var(--surface-bright)" : "transparent",
                    color: platform === p ? "var(--primary)" : "var(--ink2)",
                    border: "none", borderRadius: 4, padding: "6px 12px",
                    fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all .2s"
                  }}>{p}</button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {dtypes.map(d => (
                <div key={d} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "var(--surface-container-highest)", borderRadius: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{d}</div>
                    <div style={{ fontSize: 11, color: "var(--secondary)" }}>{fmtINR(platPrices[d] || 0)} / ea</div>
                  </div>
                  
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                     <button onClick={() => updateCount(d, -1)} style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid var(--ghost-border)", background: "transparent", color: "var(--ink)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>−</button>
                     <span className="text-data" style={{ width: 20, textAlign: "center", fontSize: 15 }}>{deliverables[d] || 0}</span>
                     <button onClick={() => updateCount(d, 1)} style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid var(--primary-raw)", background: "rgba(0,102,255,0.05)", color: "var(--primary-raw)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>+</button>
                  </div>
                </div>
              ))}

              {/* ── Custom Strategic Milestones ── */}
              <div style={{ marginTop: 20, padding: 20, background: "rgba(0,102,255,0.02)", borderRadius: 12, border: "1px dashed var(--primary-raw)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                   <div className="text-label" style={{ color: "var(--primary)" }}>CUSTOM MILESTONES</div>
                   <button 
                     className="btn-secondary" 
                     onClick={() => {
                        const title = prompt("Strategic Milestone Title (e.g. 100k Reach achieved):");
                        const amount = prompt("Budget Allocation (₹):");
                        if (title && amount) {
                           setExtraMilestones(prev => [...prev, { id: `m-${Date.now()}`, title, amount: parseInt(amount) }]);
                        }
                     }}
                     style={{ fontSize: 10, padding: "5px 12px", borderRadius: 6 }}
                   >
                     + Add Extra
                   </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                   {extraMilestones.length === 0 && (
                     <div style={{ textAlign: "center", padding: "10px", fontSize: 11, color: "var(--ink3)", background: "rgba(255,255,255,0.02)", borderRadius: 8 }}>
                       No custom gateways added.
                     </div>
                   )}
                   {extraMilestones.map(m => (
                     <div key={m.id} style={{ 
                        padding: "10px 14px", background: "var(--surface-container-highest)", borderRadius: 8,
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        border: "1px solid var(--ghost-border-visible)"
                     }}>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{m.title}</div>
                        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                           <span className="text-data" style={{ fontSize: 12 }}>{fmtINR(m.amount)}</span>
                           <button onClick={() => setExtraMilestones(prev => prev.filter(x => x.id !== m.id))} style={{ background: "none", border: "none", color: "var(--tertiary)", cursor: "pointer", fontSize: 12 }}>✕</button>
                        </div>
                     </div>
                   ))}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* ── Right: AI Insight / Contract Summary ── */}
        <div className="anim-up-2">
          
          <div className="metric-card" style={{ marginBottom: 24, padding: 24, background: "rgba(0,102,255,0.02)", borderColor: "rgba(0,102,255,0.15)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
               <span style={{ color: "var(--primary-raw)" }}>✨</span>
               <span className="text-label" style={{ color: "var(--primary)" }}>INFLURO AI INSIGHT</span>

            </div>
            <p style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.6, marginBottom: 16 }}>
              Based on {creator.handle}'s historical performance and current Audience Resonance score ({creator.score}/100), allocating budget toward <strong style={{color:"var(--ink)"}}>{Object.keys(deliverables).find(k => deliverables[k] > 0) || (platform === "YouTube" ? "Video" : "Reel")}</strong> formats yields a {platform === "YouTube" ? "2.3x" : "1.8x"} higher ROI relative to static assets.
            </p>
            <div style={{ padding: "12px", background: "var(--surface-container-high)", borderRadius: 8, border: "1px solid var(--ghost-border)" }}>
               <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                 <span style={{ fontSize: 11, color: "var(--ink3)" }}>Achievable Campaign Reach</span>
                 <span className="text-data" style={{ fontSize: 12, color: predictedReach === 0 ? "var(--ink4)" : "var(--ink)" }}>
                    {predictedReach === 0 ? "0 (Select formats)" : `~${fmtNum(predictedReach)}`}
                 </span>
               </div>
               <div style={{ display: "flex", justifyContent: "space-between" }}>
                 <span style={{ fontSize: 11, color: "var(--ink3)" }}>Est. Escrow Duration</span>
                 <span className="text-data" style={{ fontSize: 12, color: "var(--ink)" }}>14 days</span>
               </div>
            </div>
          </div>

          <div className="panel" style={{ padding: 24 }}>
            <div className="text-label" style={{ marginBottom: 20 }}>Contract Proposal</div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
              {Object.entries(deliverables).filter(([_, count]) => count > 0).map(([type, count]) => (
                <div key={type} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "var(--ink2)" }}>{count}x {type}</span>
                  <span className="text-data" style={{ fontSize: 13 }}>{fmtINR(count * (platPrices[type] || 0))}</span>
                </div>
              ))}
              {extraMilestones.map(m => (
                <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "var(--primary)" }}>★ {m.title}</span>
                  <span className="text-data" style={{ fontSize: 13 }}>{fmtINR(m.amount)}</span>
                </div>
              ))}
              {total === 0 && <div style={{ fontSize: 13, color: "var(--ink3)", fontStyle: "italic" }}>No deliverables selected</div>}
            </div>

            <div style={{ height: 1, background: "var(--ghost-border)", margin: "0 -24px 20px" }} />
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
              <span className="text-label">TOTAL ALLOCATION</span>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800 }}>{fmtINR(total)}</span>
            </div>

            {error && (
              <div style={{ color: "var(--error)", fontSize: 12, marginBottom: 16, textAlign: "center" }}>
                {error}
              </div>
            )}

            <button 
              className="btn-primary" 
              disabled={total === 0 || !title || isLaunching} 
              style={{ width: "100%", padding: "12px 0", opacity: (total === 0 || !title || isLaunching) ? 0.5 : 1 }}
              onClick={launch}
            >
              {isLaunching ? "Deploying Contract..." : "Deploy & Fund Escrow"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function fmtNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n;
}
