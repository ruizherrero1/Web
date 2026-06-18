import { ImageResponse } from "next/og";

// Icono de la app TravelKit (avión) usado como apple-touch-icon en iOS y como
// icono del manifest. Sirve en /apps/travelkit/apple-icon y solo se aplica a las
// páginas de TravelKit, sustituyendo al icono global (bandera del Mundial).
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
          background: "#0b4f8a",
        }}
      >
        <svg
          width="320"
          height="320"
          viewBox="0 0 24 24"
          fill="#ffffff"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
