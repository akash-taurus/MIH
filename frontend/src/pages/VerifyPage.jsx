import { useState, useEffect } from "react";
import { fmtINR } from "../utils/format";
import { apiFetch } from "../utils/api";

export function VerifyPage({ setPage, campaignId }) {
  const [status, setStatus] = useState("verifying");
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function verifyAndRelease() {
      try {
        setStatus("verifying");
        // Simulate a small delay for better UX and to show the animation
        await new Promise(r => setTimeout(r, 2000));
        
        const data = await apiFetch(`/api/frontend/campaigns/${campaignId}/verify`, {
          method: "POST"
        });
        setReceipt(data);
        setStatus("success");
      } catch (err) {
        console.error("Verification failed:", err);
        setError(err.message || "Verification failed");
        setStatus("error");
      }
    }
    if (campaignId) verifyAndRelease();
  }, [campaignId]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 56 }}>
      
      <div className="anim-up panel" style={{ width: "100%", maxWidth: 480, padding: 40, textAlign: "center" }}>
        
        {status === "verifying" ? (
          <>
            <div style={{ 
              width: 80, height: 80, borderRadius: "50%", margin: "0 auto 32px",
              border: "3px solid rgba(0,102,255,0.1)", borderTopColor: "var(--primary-raw)",
              animation: "spin 1s linear infinite"
            }} />
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, letterSpacing: "-.02em", marginBottom: 12 }}>
              Verifying Milestone Signature
            </h2>
            <p style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.6, marginBottom: 24 }}>
              The Influro smart contract is confirming deliverable completion and authorizing escrow release on the ledger.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ 
                  width: 6, height: 6, borderRadius: "50%", background: "var(--primary)",
                  animation: `pulse 1s ${i * 0.2}s ease-in-out infinite`
                }} />
              ))}
            </div>
          </>
        ) : status === "error" ? (
          <div>
            <div style={{ 
              width: 80, height: 80, borderRadius: "50%", margin: "0 auto 32px",
              background: "rgba(255,113,98,0.1)", display: "flex", alignItems: "center", justifyContent: "center",
              border: "1px solid rgba(255,113,98,0.3)"
            }}>
              <span style={{ fontSize: 32 }}>⚠️</span>
            </div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, letterSpacing: "-.02em", marginBottom: 12 }}>
              Verification Error
            </h2>
            <p style={{ fontSize: 14, color: "var(--ink2)", lineHeight: 1.6, marginBottom: 32 }}>
              {error}
            </p>
            <button className="btn-secondary" onClick={() => setPage("contract")} style={{ width: "100%", padding: "12px 0" }}>
              Back to Ledger
            </button>
          </div>
        ) : (
          <div className="anim-in">
            <div style={{ 
              width: 80, height: 80, borderRadius: "50%", margin: "0 auto 32px",
              background: "rgba(13,190,159,0.1)", display: "flex", alignItems: "center", justifyContent: "center",
              border: "1px solid rgba(13,190,159,0.3)", boxShadow: "0 0 24px rgba(13,190,159,0.2)"
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--secondary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, letterSpacing: "-.02em", marginBottom: 12 }}>
              Release Authorized
            </h2>
            <p style={{ fontSize: 14, color: "var(--ink2)", lineHeight: 1.6, marginBottom: 8 }}>
              Milestone approved. Funds have been distributed to the creator's verified wallet.
            </p>
            
            <div style={{ 
              background: "var(--surface-container-high)", borderRadius: 8, padding: "16px",
              marginTop: 32, marginBottom: 32, textAlign: "left"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <span className="text-label">TRANSACTION HASH</span>
                <span className="text-data" style={{ fontSize: 11, color: "var(--primary)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }}>{receipt?.tx_hash} ↗</span>
              </div>
              <div style={{ height: 1, background: "var(--ghost-border)", margin: "0 -16px 16px" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <span className="text-label">AMOUNT RELEASED</span>
                <span className="text-data" style={{ fontSize: 18, color: "var(--ink)" }}>{receipt?.amount}</span>
              </div>
            </div>

            <button className="btn-primary" onClick={() => setPage("contract")} style={{ width: "100%", padding: "12px 0" }}>
              Return to Ledger
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
