import type { Metadata } from "next";
import { MundialApp } from "./MundialApp";

export const metadata: Metadata = {
  title: "Mundial 2026 - Calendario, grupos y resultados",
  description:
    "App para seguir el calendario del Mundial 2026, horarios en España, resultados y clasificaciones de grupos.",
};

export default function MundialPage() {
  return <MundialApp />;
}
