import { ImageResponse } from "next/og";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

// Icono de reserva (estilizado, NO el escudo oficial) para poder guardar la app
// en el iPhone desde ya. Para usar el escudo oficial: coloca el PNG en
// src/app/apps/madrid/apple-icon.png (512x512, fondo solido) y borra este
// archivo; Next.js lo servira automaticamente como apple-touch-icon.
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
          background: "linear-gradient(145deg, #12224a 0%, #0a0f1c 100%)",
        }}
      >
        <div
          style={{
            width: 150,
            height: 150,
            borderRadius: "50%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#0a0f1c",
            border: "6px solid #e8c24a",
            boxShadow: "0 0 0 4px #0a0f1c",
          }}
        >
          <div style={{ fontSize: 40, lineHeight: 1 }}>👑</div>
          <div
            style={{
              marginTop: 4,
              color: "#e8c24a",
              fontSize: 52,
              fontWeight: 900,
              letterSpacing: 2,
              lineHeight: 1,
            }}
          >
            RM
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
