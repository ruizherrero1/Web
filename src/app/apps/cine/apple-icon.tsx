import { ImageResponse } from "next/og";

// Icono de la app Cine (claqueta) usado como apple-touch-icon en iOS y como
// icono del manifest. Sirve en /apps/cine/apple-icon y solo aplica a Cine.
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
          background: "linear-gradient(145deg, #f5b84b, #9e1b32)",
        }}
      >
        <svg width="300" height="300" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M20.2 6 3 10.6M16.4 3 8 5.2m8.4-2.2-3 5.2m3-5.2 2.5 4.4c.3.5.1 1.1-.4 1.3L4 12.4"
            stroke="#0a0809"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M4 8v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8H4Z"
            fill="#0a0809"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}
