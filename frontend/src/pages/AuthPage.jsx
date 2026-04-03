import { useState } from "react";
import { Particles } from "../components/Particles/Particles";

export function AuthPage({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [role, setRole] = useState("brand");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const validate = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { setError("Please enter a valid email address."); return false; }
    if (pass.length < 8) { setError("Password must be at least 8 characters long."); return false; }
    setError("");
    return true;
  };

  const submit = () => {
    if (validate()) {
      setLoading(true);
      setTimeout(() => { setLoading(false); onAuth(role); }, 1000);
    }
  };

  return (
    <div style={{ 
      minHeight: "100vh", 
      display: "flex", 
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      position: "relative", 
      overflow: "hidden",
      background: "#080808",
    }}>
      {/* ── BACKGROUND: Full-screen Particles ── */}
      <Particles
        particleCount={300}
        particleSpread={10}
        speed={0.1}
        particleColors={['#ffffff']}
        moveParticlesOnHover={true}
        particleHoverFactor={1.5}
        alphaParticles={false}
        particleBaseSize={80}
        sizeRandomness={0.6}
        cameraDistance={25}
        disableRotation={false}
      />

      {/* ── CONTENT ── */}
      <div style={{ position: "relative", zIndex: 2, textAlign: "center", marginBottom: 32 }}>
        <span style={{
          fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800,
          letterSpacing: "-.02em", color: "var(--ink)", marginBottom: 12, display: "block",
        }}>Influro</span>
        <h1 style={{
          fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 800,
          lineHeight: 1.1, letterSpacing: "-.035em",
          color: "var(--ink)", maxWidth: 600,
        }}>
          Design the Future of Influence
        </h1>
      </div>

      <div className="anim-up" style={{ width: "100%", maxWidth: 400, position: "relative", zIndex: 2 }}>
        <div style={{
          background: "rgba(255, 255, 255, 0.03)",
          backdropFilter: "blur(40px) saturate(180%)",
          WebkitBackdropFilter: "blur(40px) saturate(180%)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: 24, 
          padding: "40px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          display: "flex",
          flexDirection: "column",
        }}>
          <h2 style={{
            fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700,
            textAlign: "center", marginBottom: 8, letterSpacing: "-.01em",
            color: "#fff"
          }}>Welcome back</h2>
          <p style={{
            fontSize: 14, color: "rgba(255,255,255,0.6)", textAlign: "center", marginBottom: 32,
          }}>
            {mode === "login"
              ? "Please enter your details to access your dashboard."
              : "Create your account to get started."}
          </p>

          {/* Role selector */}
          <div style={{ marginBottom: 24 }}>
            <div className="text-label" style={{ marginBottom: 10, color: "rgba(255,255,255,0.4)", fontSize: 10 }}>I am a</div>
            <div style={{ display: "flex", gap: 10 }}>
              {[["brand", "Brand"], ["creator", "Creator"]].map(([r, label]) => (
                <button key={r} onClick={() => setRole(r)} style={{
                  flex: 1, padding: "12px 8px", borderRadius: 12,
                  border: role === r ? "1px solid rgba(255,255,255,0.3)" : "1px solid rgba(255,255,255,0.1)",
                  background: role === r ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)",
                  color: role === r ? "#fff" : "rgba(255,255,255,0.5)",
                  fontSize: 13, fontWeight: role === r ? 600 : 400,
                  cursor: "pointer", fontFamily: "var(--font-body)",
                  transition: "all .2s var(--ease-out)",
                }}>{label}</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div className="text-label" style={{ marginBottom: 8, color: "rgba(255,255,255,0.4)", fontSize: 10 }}>Email Address</div>
            <input
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                padding: "12px 16px",
                color: "#fff",
                width: "100%",
                outline: "none"
              }}
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(""); }}
              onKeyDown={e => e.key === "Enter" && submit()}
            />
          </div>
          <div style={{ marginBottom: 32 }}>
            <div className="text-label" style={{ marginBottom: 8, color: "rgba(255,255,255,0.4)", fontSize: 10 }}>Password</div>
            <input
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                padding: "12px 16px",
                color: "#fff",
                width: "100%",
                outline: "none"
              }}
              type="password"
              placeholder="••••••••"
              value={pass}
              onChange={e => { setPass(e.target.value); setError(""); }}
              onKeyDown={e => e.key === "Enter" && submit()}
            />
          </div>

          {error && (
            <div style={{
              color: "#ff7162", fontSize: 13, marginBottom: 20,
              display: "flex", alignItems: "center", gap: 8,
              background: "rgba(255,113,98,0.1)", padding: "10px 14px", borderRadius: 12,
              border: "1px solid rgba(255,113,98,0.2)"
            }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 9v4M12 17h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              {error}
            </div>
          )}

          <button className="btn-primary" style={{ 
            width: "100%", 
            padding: "14px 0", 
            fontSize: 15, 
            marginBottom: 20,
            borderRadius: 12,
            background: "linear-gradient(135deg, #0066FF, #004dc2)",
            boxShadow: "0 8px 16px rgba(0,102,255,0.2)"
          }} onClick={submit}>
            {loading
              ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                  <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin .7s linear infinite" }} />
                  Signing in...
                </span>
              : <>
                  {mode === "login" ? "Sign In" : "Create Account"}
                  <span style={{ marginLeft: 8 }}>→</span>
                </>
            }
          </button>

          <div style={{
            display: "flex", alignItems: "center", gap: 16, marginBottom: 20,
            color: "rgba(255,255,255,0.3)", fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em",
          }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
            OR
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
          </div>

          <button className="btn-secondary" style={{ 
            width: "100%", 
            padding: "12px 0", 
            fontSize: 14, 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            gap: 10,
            borderRadius: 12,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#fff"
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.56c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Google
          </button>

          <p style={{ textAlign: "center", marginTop: 32, fontSize: 14, color: "rgba(255,255,255,0.5)" }}>
            {mode === "login" ? "New to Influro? " : "Already have an account? "}
            <button onClick={() => setMode(m => m === "login" ? "signup" : "login")} style={{
              background: "none", border: "none", color: "#fff",
              cursor: "pointer", fontWeight: 700,
              textDecoration: "underline", textUnderlineOffset: 4,
            }}>{mode === "login" ? "Join now" : "Sign in"}</button>
          </p>
        </div>

        <div style={{
          display: "flex", justifyContent: "center", gap: 24, marginTop: 32,
          fontSize: 11, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: ".1em",
        }}>
          <span style={{ cursor: "pointer" }}>Privacy Policy</span>
          <span style={{ cursor: "pointer" }}>Terms of Service</span>
        </div>
      </div>
    </div>
  );
}
