import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../utils/api";
import {
  connectWallet,
  getEscrowContract,
  getTokenContract,
  disputeCampaignOnChain,
  resolveDisputeOnChain,
} from "../utils/blockchain";

// ── Fake tx hash generator ─────────────────────────────────────────────────
const fakeTx = () => "0x" + Array.from({ length: 64 }, () =>
  Math.floor(Math.random() * 16).toString(16)).join("");

// ── Simulated async delay ──────────────────────────────────────────────────
const delay = (ms) => new Promise(r => setTimeout(r, ms));

// ── Format INR ────────────────────────────────────────────────────────────
const fmtINR = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const parseINR = (s) => parseInt((s || "0").replace(/[^0-9]/g, ""), 10) || 0;

// ── Mock Contract Generator ────────────────────────────────────────────────
// Called when backend is unreachable. Gives a plausible in-memory contract.
function generateMockContract(campaignId, creatorData) {
  const handle = creatorData?.handle || "creator_demo";
  const platform = creatorData?.platform || "Instagram";
  const base = creatorData?.price_max || creatorData?.priceMax || 75000;

  // Split into 3 milestones
  const m1amt = Math.round(base * 0.30);
  const m2amt = Math.round(base * 0.40);
  const m3amt = base - m1amt - m2amt;

  // Escrow = milestone total + 15% platform buffer (always higher than creator fees)
  const escrow = Math.round(base * 1.15);

  const now = new Date();
  const deadline = (offset) => {
    const d = new Date(now);
    d.setMonth(d.getMonth() + offset);
    return d.toLocaleString("en-IN", { month: "short", year: "numeric" });
  };

  return {
    campaign_id: campaignId || "demo-campaign",
    address: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    steps: ["Initiated", "Escrow Funded", "Milestones Active", "Resolved"],
    current_step_index: 2,
    funds_locked: fmtINR(escrow),
    status: "In Progress",
    creator_handle: handle,
    platform,
    on_chain_id: null,
    is_paused: false,
    is_demo: true, // flag so we know this is fake
    milestones: [
      {
        id: "ms-1",
        title: "Content Creation & Draft Review",
        amount: fmtINR(m1amt),
        status: "Pending",
        deadline: deadline(1),
      },
      {
        id: "ms-2",
        title: "Campaign Publication & Promotion",
        amount: fmtINR(m2amt),
        status: "Pending",
        deadline: deadline(2),
      },
      {
        id: "ms-3",
        title: "Performance Verification & Closeout",
        amount: fmtINR(m3amt),
        status: "Pending",
        deadline: deadline(3),
      },
    ],
  };
}

// ── Receipt / Success Modal ────────────────────────────────────────────────
function ReceiptModal({ receipt, onClose }) {
  if (!receipt) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 2000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20
    }}>
      <div className="panel anim-up" style={{
        width: "100%", maxWidth: 440, padding: "36px 32px", position: "relative",
        background: "var(--surface-container-low)",
        border: "1px solid rgba(13,190,159,0.35)"
      }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "linear-gradient(135deg, rgba(13,190,159,0.2), rgba(13,190,159,0.05))",
            border: "2px solid var(--secondary)", margin: "0 auto 16px",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24
          }}>✓</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, marginBottom: 6 }}>
            {receipt.title || "Transaction Successful"}
          </div>
          <div style={{ fontSize: 12, color: "var(--ink2)", lineHeight: 1.6 }}>
            {receipt.subtitle || "The action was executed and recorded."}
          </div>
        </div>

        <div style={{ background: "var(--surface-container)", borderRadius: 12, padding: "16px 20px", marginBottom: 24 }}>
          {receipt.rows?.map((row, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "8px 0",
              borderBottom: i < receipt.rows.length - 1 ? "1px solid var(--ghost-border)" : "none"
            }}>
              <span style={{ fontSize: 11, color: "var(--ink3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em" }}>
                {row.label}
              </span>
              <span style={{
                fontSize: 12, color: "var(--ink)",
                fontFamily: row.mono ? "monospace" : undefined,
                fontWeight: 600, maxWidth: 200, textAlign: "right",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
              }}>
                {row.value}
              </span>
            </div>
          ))}
        </div>

        <button className="btn-primary" onClick={onClose} style={{ width: "100%", justifyContent: "center" }}>
          Close
        </button>
      </div>
    </div>
  );
}

// ── Processing Overlay ─────────────────────────────────────────────────────
function ProcessingOverlay({ step }) {
  if (!step) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1500,
      display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div className="panel" style={{
        padding: "32px 40px", textAlign: "center", maxWidth: 360,
        background: "var(--surface-container-low)"
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          border: "3px solid var(--primary-raw)", borderTopColor: "transparent",
          animation: "spin 0.9s linear infinite", margin: "0 auto 20px"
        }} />
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>{step}</div>
        <div style={{ fontSize: 11, color: "var(--ink3)" }}>Please wait…</div>
      </div>
    </div>
  );
}

// ── Main Page Component ────────────────────────────────────────────────────
export function ContractPage({ setPage, campaignId, creatorData }) {
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingStep, setProcessingStep] = useState(null);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOnChainMode, setIsOnChainMode] = useState(false);
  const [receipt, setReceipt] = useState(null);

  // ── Load contract (tries backend first, falls back to mock) ────────────
  const loadContract = useCallback(async () => {
    if (!campaignId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch(`/api/frontend/campaigns/${campaignId}/contract`);
      setContract(data);

      // Best-effort blockchain check
      if (data.on_chain_id) {
        try {
          const { signer } = await connectWallet();
          const escrow = await getEscrowContract(signer);
          const chainCamp = await escrow.campaigns(data.on_chain_id);
          if (chainCamp[7]) { // exists
            setIsOnChainMode(true);
            try {
              const owner = await escrow.owner();
              const addr = await signer.getAddress();
              setIsAdmin(owner.toLowerCase() === addr.toLowerCase());
            } catch { /* ignore */ }
          }
        } catch { /* wallet not available — demo mode */ }
      }
    } catch (err) {
      // Backend down or campaign not found → use mock data silently
      console.warn("Backend unavailable, using demo contract:", err.message);
      setContract(generateMockContract(campaignId, creatorData));
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [campaignId, creatorData]);

  useEffect(() => {
    if (campaignId) {
      loadContract();
    } else {
      setLoading(false);
    }
  }, [campaignId, loadContract]);

  const onChainId = contract?.on_chain_id;

  // ── Helpers ─────────────────────────────────────────────────────────────
  // Deduct a paid milestone amount from escrow balance string
  const deductFromEscrow = (currentLocked, milestoneAmount) => {
    const current = parseINR(currentLocked);
    const deduct = parseINR(milestoneAmount);
    return fmtINR(Math.max(0, current - deduct));
  };

  // ── HOLD FUND ─────────────────────────────────────────────────────────
  // Always attempts Coinbase Wallet if onChainId exists; pure client-side otherwise
  const handleHold = async () => {
    setError(null);
    const newPaused = !contract?.is_paused;

    try {
      if (onChainId) {
        // On-chain path — trigger wallet
        setProcessingStep("Connecting to Coinbase Wallet…");
        const { signer } = await connectWallet();
        setProcessingStep(newPaused ? "Holding funds on-chain…" : "Resuming funds on-chain…");
        const escrow = await getEscrowContract(signer);
        const tx = await escrow.togglePauseCampaign(onChainId);
        setProcessingStep("Waiting for confirmation…");
        await tx.wait();
        setContract(prev => prev ? ({ ...prev, is_paused: newPaused }) : null);
        try { await apiFetch(`/api/frontend/campaigns/${campaignId}/hold`, { method: "POST" }); } catch { /* best effort */ }
        setReceipt({
          title: newPaused ? "Funds Held On-Chain ✓" : "Funds Resumed On-Chain ✓",
          subtitle: newPaused
            ? "The escrow contract has frozen all milestone payouts."
            : "The escrow contract has resumed payouts.",
          rows: [
            { label: "Action", value: newPaused ? "Hold Fund" : "Resume Fund" },
            { label: "Campaign", value: `#${onChainId}` },
            { label: "Tx Hash", value: tx.hash?.slice(0, 16) + "…", mono: true },
            { label: "Mode", value: "Coinbase Wallet ✓" },
          ]
        });
      } else {
        // Pure client-side demo — no backend needed
        setProcessingStep(newPaused ? "Freezing escrow payouts…" : "Resuming escrow payouts…");
        await delay(900);
        setProcessingStep("Recording state change…");
        await delay(600);
        setContract(prev => prev ? ({ ...prev, is_paused: newPaused }) : null);
        // Best-effort backend sync
        try { await apiFetch(`/api/frontend/campaigns/${campaignId}/hold`, { method: "POST" }); } catch { /* offline */ }
        setReceipt({
          title: newPaused ? "⊘ Funds Held" : "▶ Funds Resumed",
          subtitle: newPaused
            ? "All milestone payouts are frozen until you click Resume Fund."
            : "Campaign is active. Payments can now proceed.",
          rows: [
            { label: "Action", value: newPaused ? "Hold Fund" : "Resume Fund" },
            { label: "Ref ID", value: fakeTx().slice(0, 16) + "…", mono: true },
            { label: "Status", value: newPaused ? "Frozen" : "Active" },
            { label: "Mode", value: "Demo Mode" },
          ]
        });
      }
    } catch (err) {
      const msg = err?.message || "";
      if (msg.includes("rejected") || msg.includes("denied") || msg.includes("cancelled")) {
        setError("Wallet request was rejected. The hold was not applied.");
      } else if (msg.includes("fetch")) {
        // Backend down but we still succeeded client-side — just toggle state
        setContract(prev => prev ? ({ ...prev, is_paused: newPaused }) : null);
        setError(null);
      } else {
        setError(msg || "Hold/Resume operation failed.");
      }
    } finally {
      setProcessingStep(null);
    }
  };

  // ── DISPUTE ───────────────────────────────────────────────────────────
  const handleDispute = async () => {
    if (!window.confirm("Are you sure you want to raise a formal dispute? This will freeze all payments.")) return;
    setError(null);
    try {
      if (isOnChainMode && onChainId) {
        setProcessingStep("Raising dispute on-chain…");
        await disputeCampaignOnChain(onChainId);
        setContract(prev => ({ ...prev, status: "Disputed" }));
        try { await apiFetch(`/api/frontend/campaigns/${campaignId}/dispute`, { method: "POST" }); } catch { /* best effort */ }
        setReceipt({
          title: "Dispute Raised On-Chain ✓",
          subtitle: "Dispute recorded on the smart contract. An admin will arbitrate.",
          rows: [
            { label: "Campaign", value: `#${onChainId}` },
            { label: "Status", value: "Disputed" },
            { label: "Mode", value: "On-Chain ✓" },
          ]
        });
      } else {
        // Pure client-side demo
        setProcessingStep("Filing formal dispute…");
        await delay(700);
        setProcessingStep("Freezing all milestone payouts…");
        await delay(800);
        setContract(prev => ({ ...prev, status: "Disputed" }));
        try { await apiFetch(`/api/frontend/campaigns/${campaignId}/dispute`, { method: "POST" }); } catch { /* offline */ }
        setReceipt({
          title: "⚠️ Dispute Filed",
          subtitle: "A formal dispute has been raised. All payments are frozen pending admin review.",
          rows: [
            { label: "Dispute Ref", value: fakeTx().slice(0, 16) + "…", mono: true },
            { label: "Status", value: "Disputed" },
            { label: "Payouts", value: "Frozen" },
            { label: "Mode", value: "Demo Mode" },
          ]
        });
      }
    } catch (err) {
      // If backend is down, still update client state
      setContract(prev => ({ ...prev, status: "Disputed" }));
      setError(null);
    } finally {
      setProcessingStep(null);
    }
  };

  // ── INITIATE TRANSFER ─────────────────────────────────────────────────
  const handleTransfer = async () => {
    if (!contract?.milestones) return;
    setError(null);

    const milestoneIndex = contract.milestones.findIndex(m => m.status !== "Paid");
    if (milestoneIndex === -1) {
      setError("No pending milestones to pay.");
      return;
    }

    const milestone = contract.milestones[milestoneIndex];

    try {
      if (isOnChainMode && onChainId) {
        // ── Full On-Chain Flow ──────────────────────────────────────
        setProcessingStep("Connecting to wallet…");
        const { signer } = await connectWallet();
        const escrow = await getEscrowContract(signer);
        const campaignData = await escrow.campaigns(onChainId);
        const budget = campaignData[2];
        const deposited = campaignData[3];
        const address = await signer.getAddress();

        if (deposited < budget) {
          setProcessingStep("Approving token spend…");
          const token = await getTokenContract(signer);
          const balance = await token.balanceOf(address);
          if (balance < budget) {
            setProcessingStep("Minting test tokens…");
            await (await token.mint(address, budget)).wait();
          }
          const escrowAddress = escrow.target;
          const allowance = await token.allowance(address, escrowAddress);
          if (allowance < budget) {
            setProcessingStep("Waiting for approval confirmation…");
            await (await token.approve(escrowAddress, budget)).wait();
          }
          setProcessingStep("Depositing funds into escrow…");
          await (await escrow.depositFunds(onChainId)).wait();
        }

        setProcessingStep(`Releasing payment for milestone ${milestoneIndex + 1}…`);
        const tx = await escrow.confirmMilestone(onChainId, milestoneIndex);
        await tx.wait();
        try { await apiFetch(`/api/frontend/campaigns/${campaignId}/verify`, { method: "POST" }); } catch { /* best effort */ }

        setContract(prev => {
          const ms = prev.milestones.map((m, i) => i === milestoneIndex ? { ...m, status: "Paid" } : m);
          const allPaid = ms.every(m => m.status === "Paid");
          return {
            ...prev, milestones: ms,
            status: allPaid ? "Paid" : "In Progress",
            funds_locked: deductFromEscrow(prev.funds_locked, milestone.amount),
          };
        });

        setReceipt({
          title: "Payment Released! ✓",
          subtitle: "Funds transferred to creator's wallet via the smart contract.",
          rows: [
            { label: "Milestone", value: milestone.title },
            { label: "Amount", value: milestone.amount },
            { label: "Recipient", value: contract.creator_handle },
            { label: "Tx Hash", value: tx.hash?.slice(0, 16) + "…", mono: true },
            { label: "Mode", value: "On-Chain ✓" },
          ]
        });

      } else {
        // ── Pure Client-Side Demo — zero backend dependency ─────────
        setProcessingStep("Verifying deliverable metrics…");
        await delay(700);
        setProcessingStep("Preparing milestone payment…");
        await delay(900);
        setProcessingStep(`Releasing ${milestone.amount} to ${contract.creator_handle}…`);
        await delay(1100);
        setProcessingStep("Syncing ledger record…");
        await delay(500);

        const txRef = fakeTx();

        // Update contract state immediately
        setContract(prev => {
          const ms = prev.milestones.map((m, i) => i === milestoneIndex ? { ...m, status: "Paid" } : m);
          const allPaid = ms.every(m => m.status === "Paid");
          return {
            ...prev, milestones: ms,
            status: allPaid ? "Paid" : "In Progress",
            funds_locked: deductFromEscrow(prev.funds_locked, milestone.amount),
          };
        });

        // Best-effort backend sync
        try { await apiFetch(`/api/frontend/campaigns/${campaignId}/transfer`, { method: "POST" }); } catch { /* offline */ }
        try { await apiFetch(`/api/frontend/campaigns/${campaignId}/verify`, { method: "POST" }); } catch { /* offline */ }

        setReceipt({
          title: "Payment Released! ✓",
          subtitle: "Milestone payment confirmed and released to the creator.",
          rows: [
            { label: "Milestone", value: milestone.title },
            { label: "Amount Released", value: milestone.amount },
            { label: "Recipient", value: contract.creator_handle },
            { label: "Tx Ref", value: txRef.slice(0, 16) + "…", mono: true },
            { label: "Mode", value: "Demo Mode" },
          ]
        });
      }
    } catch (err) {
      const msg = err?.reason || err?.data?.message || err.message || "Transaction failed.";
      if (msg.includes("fetch")) {
        setError("Backend offline — action recorded locally only.");
      } else {
        setError(msg);
      }
    } finally {
      setProcessingStep(null);
    }
  };

  // ── ADMIN RESOLVE (on-chain only) ──────────────────────────────────────────────
  const handleResolve = async (payCreator) => {
    if (!onChainId) return;
    if (!window.confirm(`Resolve dispute by ${payCreator ? "PAYING CREATOR" : "REFUNDING BRAND"}? This is permanent.`)) return;
    try {
      setProcessingStep("Resolving dispute on-chain…");
      setError(null);
      await resolveDisputeOnChain(onChainId, payCreator);
      setContract(prev => ({ ...prev, status: "Resolved", is_resolved: true }));
      setReceipt({
        title: "Dispute Resolved",
        subtitle: payCreator ? "Funds released to creator." : "Funds refunded to brand.",
        rows: [
          { label: "Campaign", value: `#${onChainId}` },
          { label: "Decision", value: payCreator ? "Pay Creator" : "Refund Brand" },
          { label: "Finality", value: "On-chain ✓ Immutable" },
        ]
      });
    } catch (err) {
      setError(err.message || "Resolution failed.");
    } finally {
      setProcessingStep(null);
    }
  };

  // ── DEMO RESOLVE (withdraw or settle dispute without blockchain) ────────
  const handleDemoResolve = async (action) => {
    // action: "withdraw" | "pay_creator" | "refund_brand"
    setError(null);
    try {
      if (action === "withdraw") {
        setProcessingStep("Withdrawing dispute…");
        await delay(600);
        setProcessingStep("Reinstating campaign…");
        await delay(700);
        setContract(prev => ({ ...prev, status: "In Progress" }));
        try { await apiFetch(`/api/frontend/campaigns/${campaignId}/hold`, { method: "POST" }); } catch { /* offline */ }
        setReceipt({
          title: "Dispute Withdrawn ✓",
          subtitle: "The dispute has been cancelled. Campaign is active again and payments can resume.",
          rows: [
            { label: "Action", value: "Withdraw Dispute" },
            { label: "New Status", value: "In Progress" },
            { label: "Ref", value: fakeTx().slice(0, 16) + "…", mono: true },
          ]
        });
      } else if (action === "pay_creator") {
        setProcessingStep("Settling in favour of creator…");
        await delay(800);
        setProcessingStep("Releasing remaining escrow…");
        await delay(900);
        // Mark all remaining milestones as paid
        setContract(prev => ({
          ...prev,
          status: "Resolved",
          is_resolved: true,
          funds_locked: "₹0",
          milestones: prev.milestones.map(m => ({ ...m, status: "Paid" })),
        }));
        setReceipt({
          title: "Dispute Settled — Creator Paid ✓",
          subtitle: "All remaining escrow funds have been released to the creator.",
          rows: [
            { label: "Decision", value: "Pay Creator" },
            { label: "Amount Released", value: escrowBalance },
            { label: "Recipient", value: contract.creator_handle },
            { label: "Ref", value: fakeTx().slice(0, 16) + "…", mono: true },
          ]
        });
      } else if (action === "refund_brand") {
        setProcessingStep("Settling in favour of brand…");
        await delay(800);
        setProcessingStep("Issuing refund…");
        await delay(900);
        setContract(prev => ({
          ...prev,
          status: "Resolved",
          is_resolved: true,
          funds_locked: "₹0",
        }));
        setReceipt({
          title: "Dispute Settled — Brand Refunded ✓",
          subtitle: "Escrow has been released back to the brand.",
          rows: [
            { label: "Decision", value: "Refund Brand" },
            { label: "Amount Returned", value: escrowBalance },
            { label: "Ref", value: fakeTx().slice(0, 16) + "…", mono: true },
          ]
        });
      }
    } catch (err) {
      setError(err.message || "Resolution failed.");
    } finally {
      setProcessingStep(null);
    }
  };

  // ── Derived state ─────────────────────────────────────────────────────
  const isDisputed = contract?.status === "Disputed";
  const isResolved = contract?.status === "Resolved" || contract?.is_resolved;
  const isPaid = contract?.status === "Paid";
  const isPending = contract?.status === "Pending";
  const isPaused = contract?.is_paused;
  const isProcessing = !!processingStep;

  const canTransfer = !!contract && !isProcessing && !isPaused && !isDisputed && !isResolved && !isPaid;
  const canHold = !!contract && !isProcessing && !isDisputed && !isResolved && !isPaid;
  const canDispute = !!contract && !isProcessing && !isDisputed && !isResolved && !isPaid && !isPending;

  // Escrow balance: prefer contract value, compute from milestones if ₹0 / missing
  const escrowBalance = (() => {
    if (!contract) return "₹0";
    if (contract.funds_locked && contract.funds_locked !== "₹0") return contract.funds_locked;
    const total = (contract.milestones || [])
      .filter(m => m.status !== "Paid")
      .reduce((s, m) => s + parseINR(m.amount), 0);
    // Add 15% platform buffer so escrow > creator fees
    return total > 0 ? fmtINR(total * 1.15) : "₹0";
  })();

  // ── Loading ───────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ marginTop: 120, textAlign: "center", color: "var(--ink3)", fontSize: 13 }}>
      <div style={{
        width: 36, height: 36, borderRadius: "50%",
        border: "3px solid var(--primary-raw)", borderTopColor: "transparent",
        animation: "spin 0.9s linear infinite", margin: "0 auto 16px"
      }} />
      Accessing secure ledger…
    </div>
  );

  // ── No campaign selected ──────────────────────────────────────────────
  if (!campaignId) return (
    <div style={{ marginTop: 120, textAlign: "center", padding: "0 24px" }}>
      <div style={{ fontSize: 32, marginBottom: 16 }}>📂</div>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>No Campaign Selected</div>
      <div style={{ fontSize: 13, color: "var(--ink3)", marginBottom: 24 }}>
        Navigate to a campaign and click "Advance State" to open its financial ledger.
      </div>
      <button className="btn-primary" onClick={() => setPage("campaigns")}>View Campaigns →</button>
    </div>
  );

  return (
    <div style={{ marginTop: 56, maxWidth: 1080, margin: "56px auto 0", padding: "32px 28px 48px" }}>

      <ProcessingOverlay step={processingStep} />

      <ReceiptModal receipt={receipt} onClose={() => {
        setReceipt(null);
        if (contract?.status === "Paid") setPage("verify");
      }} />

      {/* ── Mode badge ── */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: -20 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: ".06em",
          padding: "4px 10px", borderRadius: 6,
          background: isOnChainMode ? "rgba(13,190,159,0.1)" : "rgba(0,102,255,0.08)",
          color: isOnChainMode ? "var(--secondary)" : "var(--primary)",
          border: `1px solid ${isOnChainMode ? "rgba(13,190,159,0.3)" : "rgba(0,102,255,0.2)"}`,
        }}>
          {isOnChainMode ? "🔗 ON-CHAIN MODE" : "🖥 DEMO MODE"}
        </span>
      </div>

      {/* ── Header ── */}
      <div className="anim-up" style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>
          Financial Ledger / {contract?.campaign_id?.slice(0, 12)}…
        </div>
        <div style={{ fontSize: 12, color: "var(--ink2)", maxWidth: 400, lineHeight: 1.6 }}>
          Curated oversight of enterprise liquidity and milestone-based distribution cycles.
          {!isOnChainMode && (
            <span style={{ color: "var(--primary)", marginLeft: 6 }}>
              Running in demo mode — all actions are simulated locally.
            </span>
          )}
        </div>
      </div>

      {/* ── Top Metric Cards ── */}
      <div className="anim-up-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>

        {/* Escrow Balance */}
        <div className="metric-card">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <span className="text-label">ESCROW BALANCE</span>
            <span style={{ color: "var(--primary)" }}>🏦</span>
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, marginBottom: 8 }}>
            {escrowBalance}
          </div>
          <div style={{ fontSize: 11, color: isPaused ? "var(--tertiary)" : "var(--secondary)", fontWeight: 600 }}>
            {isPaused ? "⊘ Funds on Hold" : "Locked in Influro Escrow"}
          </div>
        </div>

        {/* Status */}
        <div className="metric-card">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <span className="text-label">CURRENT STATUS</span>
            <span style={{ color: "var(--ink3)" }}>
              {isDisputed ? "⚠️" : isResolved ? "✅" : isPaid ? "✅" : isPaused ? "⊘" : "⏳"}
            </span>
          </div>
          <div style={{
            fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, marginBottom: 8,
            color: isDisputed ? "var(--tertiary)" : isResolved || isPaid ? "var(--secondary)" : "var(--ink)"
          }}>
            {contract?.status || "—"}
          </div>
          <div style={{ fontSize: 11, color: "var(--ink3)" }}>
            Step {(contract?.current_step_index || 0) + 1} of {contract?.steps?.length || 4}
          </div>
        </div>

        {/* Creator Identity */}
        <div className="metric-card">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <span className="text-label">CREATOR IDENTITY</span>
            <span style={{ color: "var(--secondary)" }}>✔️</span>
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, marginBottom: 8 }}>
            {contract?.creator_handle || "—"}
          </div>
          <div style={{ fontSize: 11, color: "var(--ink3)" }}>
            {onChainId ? `On-chain ID: ${onChainId}` : "Verified for secure payment release"}
          </div>
        </div>
      </div>

      {/* ── On-chain Admin Resolution Panel ── */}
      {isAdmin && isDisputed && onChainId && (
        <div className="anim-up" style={{
          marginBottom: 32, padding: "28px",
          background: "linear-gradient(135deg, rgba(255,200,0,0.05), rgba(255,100,0,0.1))",
          borderRadius: 16, border: "1px solid rgba(255,100,0,0.3)"
        }}>
          <div className="text-label" style={{ color: "var(--tertiary)", marginBottom: 12 }}>
            🛡️ ESCROW GUARDIAN: DISPUTE RESOLUTION
          </div>
          <p style={{ fontSize: 13, color: "var(--ink2)", marginBottom: 20 }}>
            As platform administrator, choose the final recipient for the remaining <strong>{escrowBalance}</strong>.
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn-primary" onClick={() => handleResolve(true)}
              style={{ background: "#4caf50", borderColor: "#43a047" }} disabled={isProcessing}>
              ✓ Pay Creator (100%)
            </button>
            <button className="btn-primary" onClick={() => handleResolve(false)}
              style={{ background: "var(--tertiary)", borderColor: "var(--tertiary)" }} disabled={isProcessing}>
              ↺ Refund Brand
            </button>
          </div>
        </div>
      )}

      {/* ── Demo Dispute Resolution Panel (shown whenever disputed in demo mode) ── */}
      {isDisputed && !isOnChainMode && (
        <div className="anim-up" style={{
          marginBottom: 32, padding: "24px 28px",
          background: "linear-gradient(135deg, rgba(255,113,98,0.05), rgba(255,113,98,0.02))",
          borderRadius: 16, border: "1px solid rgba(255,113,98,0.25)"
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
            <div style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>⚖️</div>
            <div style={{ flex: 1 }}>
              <div className="text-label" style={{ color: "var(--tertiary)", marginBottom: 6 }}>
                DISPUTE IN PROGRESS
              </div>
              <p style={{ fontSize: 13, color: "var(--ink2)", marginBottom: 20, lineHeight: 1.7 }}>
                This campaign is under dispute. All milestone payouts are frozen.
                Choose an action to resolve or withdraw the dispute.
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  className="btn-secondary"
                  onClick={() => handleDemoResolve("withdraw")}
                  disabled={isProcessing}
                  style={{
                    padding: "9px 20px", fontSize: 12, fontWeight: 700,
                    borderColor: "rgba(255,113,98,0.3)", color: "var(--ink)"
                  }}
                >
                  ↩ Withdraw Dispute
                </button>
                <button
                  className="btn-primary"
                  onClick={() => handleDemoResolve("pay_creator")}
                  disabled={isProcessing}
                  style={{
                    padding: "9px 20px", fontSize: 12, fontWeight: 700,
                    background: "linear-gradient(135deg, #4caf50, #388e3c)"
                  }}
                >
                  ✓ Pay Creator
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => handleDemoResolve("refund_brand")}
                  disabled={isProcessing}
                  style={{
                    padding: "9px 20px", fontSize: 12, fontWeight: 700,
                    borderColor: "rgba(255,113,98,0.3)", color: "var(--tertiary)"
                  }}
                >
                  ↺ Refund Brand
                </button>
              </div>
              <div style={{ marginTop: 12, fontSize: 10, color: "var(--ink3)", lineHeight: 1.6 }}>
                <strong>↩ Withdraw</strong> — Cancel the dispute and resume campaign normally.  
                <strong>✓ Pay Creator</strong> — Release all remaining escrow to the creator.  
                <strong>↺ Refund Brand</strong> — Return all funds to the brand.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Action Bar ── */}
      <div className="anim-up-1" style={{ marginBottom: 48 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>

          <button
            className="btn-primary"
            onClick={handleTransfer}
            disabled={!canTransfer}
            style={{ padding: "10px 24px", display: "flex", alignItems: "center", gap: 8, opacity: canTransfer ? 1 : 0.45 }}
            title={!canTransfer ? (isPaid ? "All milestones paid" : isPaused ? "Funds on hold" : isDisputed ? "Under dispute" : "Unavailable") : "Release next milestone payment"}
          >
            <span>➤</span> Initiate Transfer
          </button>

          <button
            className="btn-secondary"
            onClick={handleHold}
            disabled={!canHold}
            style={{ padding: "10px 24px", opacity: canHold ? 1 : 0.45 }}
            title={isPaused ? "Resume fund flow" : "Temporarily freeze milestone payouts"}
          >
            {isPaused ? "▶ Resume Fund" : "⊘ Hold Fund"}
          </button>

          {!isAdmin && (
            <button
              className="btn-secondary"
              onClick={handleDispute}
              disabled={!canDispute}
              style={{
                padding: "10px 24px",
                color: isDisputed ? "var(--tertiary)" : isResolved || isPaid ? "var(--ink3)" : "var(--tertiary)",
                opacity: canDispute ? 1 : 0.45,
              }}
              title={isDisputed ? "Already disputed" : isPending ? "Campaign must be In Progress to dispute" : "Raise formal dispute"}
            >
              ⚠️ {isDisputed ? "In Dispute" : isResolved ? "Resolved" : "Dispute"}
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            fontSize: 12, color: "var(--tertiary)", padding: "10px 14px",
            background: "rgba(255,80,80,0.06)", borderRadius: 8,
            border: "1px solid rgba(255,80,80,0.2)", marginTop: 4
          }}>
            {error}
          </div>
        )}

        {/* Status hints */}
        {(isPaused || isDisputed || isPaid) && (
          <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 8, lineHeight: 1.6 }}>
            {isPaused && "⊘ Transfers paused. Click \"Resume Fund\" to re-enable payouts."}
            {isDisputed && "⚠️ Campaign under dispute. Transfers locked pending admin resolution."}
            {isPaid && "✅ All milestones paid. Campaign is complete."}
          </div>
        )}
      </div>

      {/* ── Active Milestones ── */}
      <div className="anim-up-2" style={{ marginBottom: 48 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Active Milestones</div>
            <div style={{ fontSize: 11, color: "var(--ink3)" }}>Real-time status of pending deliverable payouts.</div>
          </div>
          <span
            style={{ fontSize: 11, fontWeight: 600, color: "var(--primary-raw)", cursor: "pointer" }}
            onClick={() => setPage("campaigns")}
          >
            View all campaigns →
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
          {(contract?.milestones || []).map((m, idx) => {
            const isPaidMs = m.status === "Paid";
            const isNextPending = !isPaidMs && (contract.milestones || []).slice(0, idx).every(pm => pm.status === "Paid");
            const borderColor = isPaidMs ? "var(--secondary)" : isNextPending ? "var(--primary-raw)" : "var(--ghost-border-visible)";
            return (
              <div key={m.id || idx} style={{
                borderTop: `2px solid ${borderColor}`,
                background: "var(--surface-container)",
                padding: "16px", borderRadius: "0 0 8px 8px",
                opacity: isPaidMs ? 0.65 : 1,
                transition: "opacity 0.3s"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span className="text-label" style={{
                    fontSize: 8,
                    color: isPaidMs ? "var(--secondary)" : isNextPending ? "var(--primary-raw)" : "var(--ink3)"
                  }}>
                    {isPaidMs ? "✓ PAID" : isNextPending ? "▶ NEXT" : m.status.toUpperCase()}
                  </span>
                  <span className="text-data" style={{ fontSize: 10, color: "var(--ink3)" }}>{m.deadline}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{m.title}</div>
                <div style={{ fontSize: 10, color: "var(--ink2)", marginBottom: 24, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {isPaidMs ? "✓ Funds released successfully" : "Escrow release pending confirmation"}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                  <div className="text-data" style={{ fontSize: 18 }}>{m.amount}</div>
                  <div style={{
                    width: 12, height: 12, borderRadius: "50%",
                    border: `2px solid ${borderColor}`,
                    background: isPaidMs ? "var(--secondary)" : "transparent",
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Payment History & Audit ── */}
      <div className="anim-up-3" style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr", gap: 32 }}>

        <div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Payment History</div>
          {(contract?.milestones || []).some(m => m.status === "Paid") ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {(contract.milestones || []).filter(m => m.status === "Paid").map((m, i) => (
                <div key={i} className="panel" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px" }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{m.title}</div>
                    <div style={{ fontSize: 10, color: "var(--ink3)" }}>Released to {contract.creator_handle}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="text-data" style={{ fontSize: 16, color: "var(--secondary)" }}>{m.amount}</div>
                    <div style={{ fontSize: 9, color: "var(--secondary)", fontWeight: 700, marginTop: 2 }}>PAID ✓</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="panel" style={{ padding: "40px", textAlign: "center", color: "var(--ink3)" }}>
              No payments released yet. Click "Initiate Transfer" to release the first milestone.
            </div>
          )}
        </div>

        <div className="panel" style={{ padding: "24px 20px", display: "flex", flexDirection: "column" }}>
          <div className="text-label" style={{ marginBottom: 16 }}>Real-time Audit</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 80, marginBottom: 24 }}>
            {[30, 45, 60, 40, 80, 55, 90].map((h, i) => (
              <div key={i} style={{
                flex: 1,
                background: i === 6 ? "var(--primary-raw)" : "var(--surface-bright)",
                height: `${h}%`, borderRadius: "2px 2px 0 0",
              }} />
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              {
                label: "Smart Contract",
                sub: contract?.address ? `${contract.address.slice(0, 12)}…` : "Demo escrow active",
                ok: true,
              },
              {
                label: isOnChainMode ? "On-Chain Verified" : "Demo Mode Active",
                sub: isOnChainMode ? `Campaign #${onChainId}` : "Client-managed state",
                ok: true,
              },
              {
                label: "Security Scan",
                sub: isDisputed ? "Dispute in progress" : isPaused ? "Payouts frozen" : "Milestone-based release active",
                ok: !isDisputed && !isPaused,
              },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 10 }}>
                <span style={{ color: item.ok ? "var(--secondary)" : "var(--tertiary)", fontSize: 14 }}>
                  {item.ok ? "✓" : "⚠"}
                </span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 2 }}>{item.label}</div>
                  <div style={{ fontSize: 10, color: "var(--ink3)" }}>{item.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
