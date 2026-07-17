import { ImageResponse } from "next/og";

// Dedicated 1200×630 OG image, self-contained (§7).
export const alt = "Facty — facturation et QR-facture pour indépendants suisses";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          backgroundColor: "#0F172A",
          color: "#FFFFFF",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "12px",
              backgroundColor: "#2563EB",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "32px",
              fontWeight: 700,
            }}
          >
            F
          </div>
          <div style={{ display: "flex", fontSize: "34px", fontWeight: 600 }}>
            <span>Fact</span>
            <span style={{ color: "#60A5FA" }}>y</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: "76px", fontWeight: 700, lineHeight: 1.05, letterSpacing: "-2px" }}>
            Facturez en 2 minutes.
          </div>
          <div style={{ fontSize: "76px", fontWeight: 700, lineHeight: 1.05, letterSpacing: "-2px", color: "#60A5FA" }}>
            Soyez payé à temps.
          </div>
        </div>

        <div style={{ display: "flex", gap: "16px", fontSize: "26px", color: "#94A3B8" }}>
          <span>Devis · Factures · QR-facture suisse</span>
          <span>·</span>
          <span>Relances automatiques</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
