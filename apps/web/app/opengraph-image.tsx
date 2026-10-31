import { ImageResponse } from "next/og";

export const alt = "Desmond Odeyemi — Product Engineer & Product Designer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#F2EFE7", color: "#1D1D1A", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, fontFamily: "Georgia, serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace" }}>
          <span>The Working Atlas</span><span>Product engineering / design</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 132, lineHeight: 0.95, letterSpacing: -4 }}>Desmond Odeyemi</div>
          <div style={{ fontSize: 40, marginTop: 24, color: "#4A4A44" }}>Product Engineer &amp; Product Designer</div>
        </div>
        <div style={{ display: "flex", height: 8, width: 160, background: "#B84A32" }} />
      </div>
    ),
    size
  );
}
