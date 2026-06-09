import { ImageResponse } from "next/og";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Spanish flag — red / yellow / red */}
      <div style={{ height: "60%", display: "flex", flexDirection: "column" }}>
        <div style={{ background: "#c60b1e", flex: 1 }} />
        <div style={{ background: "#ffc400", flex: 2 }} />
        <div style={{ background: "#c60b1e", flex: 1 }} />
      </div>
      {/* Text strip */}
      <div
        style={{
          height: "40%",
          background: "#0d1b2a",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            color: "#ffffff",
            fontSize: "28px",
            fontWeight: 900,
            lineHeight: "1",
            letterSpacing: "2px",
          }}
        >
          MUNDIAL
        </div>
        <div
          style={{
            color: "#ffc400",
            fontSize: "22px",
            fontWeight: 700,
            lineHeight: "1.2",
          }}
        >
          2026
        </div>
      </div>
    </div>,
    { ...size },
  );
}
