"use client";

import { useState, useTransition } from "react";

import { sendSampleEmail } from "@/app/actions/dev-emails";

type Sample = {
  key: string;
  label: string;
  family: "A" | "B";
  subject: string;
  html: string;
  text: string;
};

export function EmailPreview({ samples, defaultTo }: { samples: Sample[]; defaultTo: string }) {
  const [activeKey, setActiveKey] = useState(samples[0]?.key);
  const [mobile, setMobile] = useState(false);
  const [showText, setShowText] = useState(false);
  const [to, setTo] = useState(defaultTo);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  const active = samples.find((s) => s.key === activeKey) ?? samples[0];

  function send() {
    setResult(null);
    start(async () => {
      const res = await sendSampleEmail(active.key, to);
      if (res.ok) setResult(res.simulated ? "Simulé (pas de clé Resend) ✓" : "Envoyé ✓");
      else setResult(`Échec : ${res.error}`);
    });
  }

  return (
    <div style={{ display: "flex", minHeight: "100dvh", fontFamily: "system-ui, sans-serif", color: "#0f172a" }}>
      {/* Sidebar */}
      <aside style={{ width: 260, borderRight: "1px solid #e2e8f0", padding: 20, background: "#f8fafc" }}>
        <h1 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 4px" }}>Aperçu emails</h1>
        <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 16px" }}>Facty — dev only</p>

        {(["B", "A"] as const).map((fam) => (
          <div key={fam} style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, color: "#94a3b8", margin: "0 0 6px" }}>
              {fam === "B" ? "Famille B — marque utilisateur" : "Famille A — marque Facty"}
            </p>
            {samples
              .filter((s) => s.family === fam)
              .map((s) => (
                <button
                  key={s.key}
                  onClick={() => setActiveKey(s.key)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 10px",
                    marginBottom: 4,
                    borderRadius: 8,
                    border: "1px solid",
                    borderColor: s.key === active.key ? "#0f172a" : "transparent",
                    background: s.key === active.key ? "#fff" : "transparent",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  {s.label}
                </button>
              ))}
          </div>
        ))}
      </aside>

      {/* Main */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", background: "#eef2f6" }}>
        <header style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: "1px solid #e2e8f0", background: "#fff", flexWrap: "wrap" }}>
          <strong style={{ fontSize: 14 }}>{active.label}</strong>
          <span style={{ fontSize: 12, color: "#64748b" }}>Objet : {active.subject} ({active.subject.length} car.)</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => setMobile(false)} style={tab(!mobile)}>Desktop</button>
            <button onClick={() => setMobile(true)} style={tab(mobile)}>Mobile 375</button>
            <button onClick={() => setShowText((v) => !v)} style={tab(showText)}>Texte</button>
          </div>
        </header>

        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "#fff", borderBottom: "1px solid #e2e8f0" }}>
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="adresse de test"
            style={{ flex: "0 1 320px", padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }}
          />
          <button onClick={send} disabled={pending} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#0f172a", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {pending ? "Envoi…" : "M'envoyer ce template"}
          </button>
          {result && <span style={{ fontSize: 13, color: result.startsWith("Échec") ? "#b91c1c" : "#15803d" }}>{result}</span>}
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: 20, display: "flex", justifyContent: "center" }}>
          {showText ? (
            <pre style={{ width: "100%", maxWidth: 640, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, fontSize: 13, whiteSpace: "pre-wrap", fontFamily: "ui-monospace, monospace" }}>
              {active.text}
            </pre>
          ) : (
            <iframe
              key={active.key + (mobile ? "-m" : "-d")}
              title={active.label}
              srcDoc={active.html}
              style={{ width: mobile ? 375 : "100%", maxWidth: mobile ? 375 : 680, height: "100%", minHeight: 700, border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff" }}
            />
          )}
        </div>
      </main>
    </div>
  );
}

const tab = (active: boolean): React.CSSProperties => ({
  padding: "6px 12px",
  borderRadius: 8,
  border: "1px solid " + (active ? "#0f172a" : "#cbd5e1"),
  background: active ? "#0f172a" : "#fff",
  color: active ? "#fff" : "#0f172a",
  fontSize: 12,
  cursor: "pointer",
});
