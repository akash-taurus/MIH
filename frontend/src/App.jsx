import { useState, useEffect } from "react";
import { Nav } from "./components/Nav";
import { AuthPage } from "./pages/AuthPage";
import { DiscoverPage } from "./pages/DiscoverPage";
import { AnalyzePage } from "./pages/AnalyzePage";
import { CreateCampaign } from "./pages/CreateCampaign";
import { ContractPage } from "./pages/ContractPage";
import { VerifyPage } from "./pages/VerifyPage";
import { CampaignsPage } from "./pages/CampaignsPage";
import { CreatorDashboard } from "./pages/CreatorDashboard";
import "./index.css";

export default function App() {
  const [role, setRole] = useState(null);
  const [page, setPage] = useState("auth");
  const [creatorData, setCreatorData] = useState(null);
  const [campaignId, setCampaignId] = useState(null);

  const onAuth = (r) => {
    setRole(r);
    setPage(r === "creator" ? "creator-dash" : "discover");
  };

  const showNav = page !== "auth";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--ink)" }}>
      {showNav && (
        <Nav page={page} setPage={setPage} role={role} setRole={setRole} />
      )}

      {page === "auth" && <AuthPage onAuth={onAuth} />}
      {page === "discover" && <DiscoverPage setPage={setPage} setCreatorData={setCreatorData} />}
      {page === "analyze" && <AnalyzePage setPage={setPage} setCreatorData={setCreatorData} />}
      {page === "create-campaign" && <CreateCampaign setPage={setPage} creatorData={creatorData} setCampaignId={setCampaignId} />}
      {page === "contract" && <ContractPage setPage={setPage} creatorData={creatorData} campaignId={campaignId} />}
      {page === "verify" && <VerifyPage setPage={setPage} campaignId={campaignId} />}
      {page === "campaigns" && <CampaignsPage setPage={setPage} setCampaignId={setCampaignId} />}
      {page === "creator-dash" && <CreatorDashboard />}
    </div>
  );
}
