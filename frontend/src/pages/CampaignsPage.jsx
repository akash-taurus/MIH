import { useState, useEffect } from "react";
import { apiFetch } from "../utils/api";

export function CampaignsPage({ setPage, setCampaignId }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  
  // New functional states
  const [commentText, setCommentText] = useState("");
  const [localComments, setLocalComments] = useState({}); // { campaignId: [comments] }
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    async function loadCampaigns() {
      try {
        setLoading(true);
        const data = await apiFetch("/api/frontend/campaigns");
        setCampaigns(data.campaigns || []);
        if (data.campaigns?.length > 0) {
          setActiveId(data.campaigns[0].id);
        }
      } catch (err) {
        console.error("Failed to load campaigns:", err);
      } finally {
        setLoading(false);
      }
    }
    loadCampaigns();
  }, []);

  const handleSendComment = () => {
    if (!commentText.trim() || !activeId) return;
    
    const text = commentText.trim();
    const newComment = {
      id: Date.now(),
      author: "YOU",
      text: text,
      time: "Just now"
    };
    
    setLocalComments(prev => ({
      ...prev,
      [activeId]: [...(prev[activeId] || []), newComment]
    }));
    setCommentText("");

    // Simulate active collaboration responses
    const lowerText = text.toLowerCase();
    if (lowerText === "yes" || lowerText === "continue") {
      setTimeout(() => {
        const sysReply = {
          id: Date.now() + 1,
          author: "INFLURO AI SYSTEM",
          text: "Action confirmed. Redirecting to financial ledger to advance state...",
          time: "Just now",
          isSystem: true
        };
        setLocalComments(prev => ({
          ...prev,
          [activeId]: [...(prev[activeId] || []), sysReply]
        }));
        
        setTimeout(() => {
          if (activeCamp) {
            setCampaignId(activeCamp.id.toString());
            setPage("contract");
          }
        }, 1500);
      }, 500);
    }
  };

  const steps = ["DISCOVER", "REVIEW", "NEGOTIATE", "APPROVE", "PUBLISH", "VERIFY", "RELEASE"];
  
  const activeCamp = campaigns.find(c => c.id === activeId);

  const getAuditLogs = (camp) => {
    const logs = [
      { time: "2024-03-20 10:00", event: "Campaign draft initialized in system" },
      { time: "2024-03-20 10:05", event: "Smart contract parameters locked" }
    ];
    if (camp.on_chain_id) {
      logs.push({ time: "2024-03-21 14:30", event: `On-chain deployment verified (ID: ${camp.on_chain_id})` });
      logs.push({ time: "2024-03-21 14:35", event: "Escrow funded via brand wallet" });
    }
    if (camp.status === "Paid") {
      logs.push({ time: "2024-03-25 09:12", event: "Deliverable verification passed via Verity AI" });
      logs.push({ time: "2024-03-25 09:15", event: "Payment released to creator wallet" });
    } else if (camp.status === "In Progress") {
      logs.push({ time: "2024-03-22 11:00", event: "Campaign moved to In Progress state" });
    }
    return logs;
  };

  return (
    <div style={{ marginTop: 56, maxWidth: 1080, margin: "56px auto 0", padding: "32px 28px 48px" }}>
      
      {/* Audit Log Modal */}
      {showLogs && activeCamp && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div className="panel" style={{ width: "100%", maxWidth: 500, background: "var(--surface-container-low)", padding: 32, position: "relative" }}>
            <button 
              onClick={() => setShowLogs(false)}
              style={{ position: "absolute", right: 20, top: 20, background: "none", border: "none", color: "var(--ink3)", cursor: "pointer", fontSize: 20 }}
            >×</button>
            <div className="text-label" style={{ marginBottom: 20 }}>Immutable Audit Trail</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {getAuditLogs(activeCamp).map((log, i) => (
                <div key={i} style={{ borderLeft: "2px solid var(--primary-raw)", paddingLeft: 16 }}>
                  <div style={{ fontSize: 10, color: "var(--ink3)", marginBottom: 4 }}>{log.time}</div>
                  <div style={{ fontSize: 13, color: "var(--ink)" }}>{log.event}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Header & Stepper ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40 }}>
        <div>
          <div className="text-label" style={{ marginBottom: 6 }}>WORKFLOW</div>
          <div style={{ fontSize: 13, color: "var(--ink2)", maxWidth: 300, lineHeight: 1.6 }}>
            Curating performance and orchestration for enterprise-scale influencer operations.
          </div>
        </div>
        
        {activeCamp && (
          <div className="stepper" style={{ flex: 1, maxWidth: 640 }}>
            {steps.map((s, i) => {
              const statusMap = {
                "Pending": "REVIEW",
                "In Progress": "PUBLISH",
                "Paid": "RELEASE"
              };
              const currentStep = statusMap[activeCamp.status] || "REVIEW";
              const isActive = s === currentStep;
              const isDone = steps.indexOf(s) < steps.indexOf(currentStep);
              return (
                <div key={s} className={`stepper-step ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}>
                  <div className="stepper-num">{i < 9 ? `0${i+1}` : i+1}</div>
                  <div className="stepper-label">{s}</div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ textAlign: "right", marginLeft: 40 }}>
          <div className="text-label" style={{ marginBottom: 6 }}>LIVE CAMPAIGNS</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800 }}>
            {campaigns.length} <span style={{ fontSize: 14, color: "var(--secondary)", fontWeight: 600 }}>Total</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "100px" }}>Loading campaign manifest...</div>
      ) : campaigns.length === 0 ? (
        <div style={{ textAlign: "center", padding: "100px" }} className="panel">
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>No active campaigns found</div>
          <p style={{ color: "var(--ink3)", marginBottom: 24 }}>Start by discovering creators and drafting a proposal.</p>
          <button className="btn-primary" onClick={() => setPage("discover")}>Discovery Network</button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 32 }}>
          
          {/* ── Left: Active Manifest ── */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <span className="text-label">Active Manifest</span>
              <span className="text-label">Count: {campaigns.length < 10 ? `0${campaigns.length}` : campaigns.length}</span>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {campaigns.map(c => (
                <div 
                  key={c.id} 
                  onClick={() => setActiveId(c.id)}
                  className="panel"
                  style={{ 
                    padding: "16px", cursor: "pointer",
                    background: activeId === c.id ? "var(--surface-container)" : "var(--surface-container-low)",
                    border: activeId === c.id ? "1px solid var(--ghost-border-visible)" : "1px solid var(--ghost-border)",
                    position: "relative",
                    overflow: "hidden"
                  }}
                >
                  {activeId === c.id && (
                    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: "var(--primary-raw)" }} />
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{c.name.split(" for ")[0]}</div>
                      <div style={{ fontSize: 10, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: ".04em", fontWeight: 600 }}>{c.creator}</div>
                    </div>
                    <span className="badge-warning" style={{ 
                      background: c.status === "Paid" ? "rgba(13,190,159,0.1)" : "rgba(0,102,255,0.1)", 
                      color: c.status === "Paid" ? "var(--secondary)" : "var(--primary)" 
                    }}>{c.status.toUpperCase()}</span>
                  </div>
                  
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 8, color: "var(--ink2)" }}>
                    <span>Completion</span>
                    <span className="text-data">{c.progress}%</span>
                  </div>
                  <div style={{ height: 4, background: "var(--surface-container-highest)", borderRadius: 2, marginBottom: 16 }}>
                    <div style={{ height: "100%", width: `${c.progress}%`, background: "var(--primary-raw)", borderRadius: 2 }} />
                  </div>
                  
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--surface-bright)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9 }}>{c.platform[0]}</div>
                    </div>
                    <span style={{ fontSize: 11, color: "var(--ink3)" }}>{c.budget}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: Campaign Details ── */}
          {activeCamp && (
            <div className="anim-up panel" style={{ padding: "32px", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800 }}>{activeCamp.name}</span>
                    <span className="badge-success" style={{ background: "var(--primary-raw)", color: "#fff" }}>ACTIVE INSIGHT</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink3)" }}>Campaign ID: {activeCamp.id} • {activeCamp.platform}</div>
                </div>
                <div className="btn-group-responsive">
                  <button 
                    className="btn-secondary" 
                    style={{ padding: "8px 16px" }}
                    onClick={() => setShowLogs(true)}
                  >Audit Log</button>
                  <button 
                    className="btn-primary" 
                    style={{ padding: "8px 24px" }}
                    onClick={() => {
                      setCampaignId(activeCamp.id.toString());
                      setPage("contract");
                    }}
                  >Advance State</button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
                {/* Intel left */}
                <div>
                  <div className="text-label" style={{ marginBottom: 12 }}>Strategic Intent</div>
                  <p style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.7, marginBottom: 32 }}>
                    {activeCamp.brief || `Campaign focused on ${activeCamp.creator}'s audience for high-fidelity storytelling. ROI projected to be optimized via ${activeCamp.platform} native features.`}
                  </p>

                  <div className="text-label" style={{ marginBottom: 16 }}>State Requirements</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
                    {[
                      { text: "Contractual terms finalized", done: true },
                      { text: "Content brief delivery verified", done: activeCamp.status !== "Pending" },
                      { text: "On-chain escrow funded", done: !!activeCamp.on_chain_id },
                      { text: "Deliverable verification", done: activeCamp.status === "Paid" },
                    ].map((req, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                         <div style={{ 
                           width: 16, height: 16, borderRadius: 4, 
                           border: req.done ? "none" : "1px solid var(--ghost-border-visible)",
                           background: req.done ? "var(--primary-raw)" : "transparent",
                           display: "flex", alignItems: "center", justifyContent: "center" 
                         }}>
                           {req.done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                         </div>
                         <span style={{ fontSize: 13, color: req.done ? "var(--ink3)" : "var(--ink)", textDecoration: req.done ? "line-through" : "none" }}>{req.text}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ 
                    background: "rgba(13,190,159,0.08)", border: "1px solid rgba(13,190,159,0.2)",
                    borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12
                  }}>
                    <span style={{ color: "var(--secondary)", fontSize: 16 }}>🛡</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--secondary)", marginBottom: 2 }}>System Compliance</div>
                      <div style={{ fontSize: 10, color: "var(--secondary)", opacity: 0.8 }}>On-chain ID: {activeCamp.on_chain_id || "Awaiting..."}</div>
                    </div>
                  </div>
                </div>

                {/* Chat right */}
                <div>
                  <div className="text-label" style={{ marginBottom: 16 }}>Active Collaboration</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    
                    <div style={{ display: "flex", gap: 12 }}>
                      <div style={{ width: 24, height: 24, borderRadius: "50%", background: "linear-gradient(135deg, var(--primary), var(--primary-container))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 }}>V</div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>INFLURO AI <span style={{ color: "var(--ink3)", fontSize: 10, fontWeight: 400, marginLeft: 6 }}>SYSTEM</span></div>
                        <div style={{ 
                          fontSize: 12, color: "var(--ink)", lineHeight: 1.5, fontStyle: "italic",
                          background: "rgba(0,102,255,0.06)", padding: "10px 14px", borderRadius: "0 8px 8px 8px",
                          border: "1px solid rgba(0,102,255,0.15)"
                        }}>
                          {activeCamp.status === "Pending" 
                            ? "Awaiting brand confirmation to proceed with content review." 
                            : activeCamp.status === "In Progress"
                            ? "Content detected on-platform. Verification in progress."
                            : "Campaign successfully resolved on-chain."}
                        </div>
                      </div>
                    </div>

                    {/* Local session comments */}
                    {(localComments[activeId] || []).map(comment => (
                      <div key={comment.id} style={{ display: "flex", gap: 12 }}>
                        <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--surface-bright)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "var(--ink3)", flexShrink: 0 }}>U</div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{comment.author} <span style={{ color: "var(--ink3)", fontSize: 10, fontWeight: 400, marginLeft: 6 }}>{comment.time}</span></div>
                          <div style={{ 
                            fontSize: 12, color: "var(--ink)", lineHeight: 1.5,
                            background: "var(--surface-container)", padding: "10px 14px", borderRadius: "0 8px 8px 8px",
                            border: "1px solid var(--ghost-border-visible)"
                          }}>
                            {comment.text}
                          </div>
                        </div>
                      </div>
                    ))}

                    <div style={{ marginTop: 16, position: "relative" }}>
                      <input 
                        className="input" 
                        placeholder="Add a comment or tag team..." 
                        style={{ paddingRight: 40, borderRadius: 20 }}
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSendComment()}
                      />
                      <span 
                        style={{ position: "absolute", right: 14, top: 12, color: "var(--primary-raw)", fontSize: 16, cursor: "pointer" }}
                        onClick={handleSendComment}
                      >➤</span>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
