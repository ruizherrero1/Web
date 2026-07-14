import { ImageResponse } from "next/og";

// Icono de la app Cine (claqueta) para "Anadir a pantalla de inicio" y el
// manifest. Construido con divs (rects/skew) en lugar de paths SVG porque el
// renderizador de ImageResponse (satori) dibuja mal los paths con stroke y el
// icono anterior salia deformado.
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(160deg, #f6bd57 0%, #a71f36 100%)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", width: 330 }}>
          <div
            style={{
              display: "flex",
              height: 78,
              borderRadius: "18px 18px 4px 4px",
              overflow: "hidden",
              transform: "rotate(-8deg)",
              transformOrigin: "bottom left",
              backgroundColor: "#170a0d",
            }}
          >
            {[0, 1, 2, 3].map((stripe) => (
              <div
                key={stripe}
                style={{
                  width: 50,
                  height: 120,
                  backgroundColor: "#f7ecd9",
                  transform: "skewX(-24deg)",
                  marginLeft: stripe === 0 ? 30 : 34,
                }}
              />
            ))}
          </div>
          <div
            style={{
              display: "flex",
              height: 150,
              marginTop: 8,
              borderRadius: "6px 6px 22px 22px",
              backgroundColor: "#170a0d",
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}
