import { ImageResponse } from "next/og";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        background: "linear-gradient(160deg, #0d1b2a 0%, #1a3a5f 100%)",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          color: "#dc2626",
          fontSize: "100px",
          fontWeight: 900,
          lineHeight: "1",
          letterSpacing: "-4px",
        }}
      >
        M
      </div>
      <div
        style={{
          color: "#ffffff",
          fontSize: "38px",
          fontWeight: 700,
          lineHeight: "1",
          letterSpacing: "8px",
          marginLeft: "8px",
        }}
      >
        26
      </div>
    </div>,
    { ...size },
  );
}
