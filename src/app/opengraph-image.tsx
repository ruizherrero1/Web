import { ImageResponse } from "next/og";

export const alt = "Ramón Ruiz Herrero";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #071d33 0%, #0b1729 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            color: "#0b4f8a",
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: 32,
          }}
        >
          ramonruizherrero.com
        </div>
        <div
          style={{
            color: "white",
            fontSize: 68,
            fontWeight: 700,
            lineHeight: 1.1,
            marginBottom: 28,
          }}
        >
          Ramón Ruiz Herrero
        </div>
        <div
          style={{
            color: "#6b7f99",
            fontSize: 26,
            lineHeight: 1.5,
            maxWidth: 750,
          }}
        >
          CEO y Partner de Stratos Consulting · Consultor tecno-financiero
          especializado en mercados, integraciones y producto digital.
        </div>
      </div>
    ),
    { ...size },
  );
}
