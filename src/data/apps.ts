export type AppStatus =
  | "Activo"
  | "En desarrollo"
  | "Idea"
  | "Privado"
  | "Próximamente";

export type AppAccess = "Público" | "Privado" | "Invitación" | "Solo Ramón";

export type AppItem = {
  name: string;
  slug: string;
  description: string;
  status: AppStatus;
  access: AppAccess;
  href: string;
  focus: string;
};

export const apps = [
  {
    name: "GymLog",
    slug: "gym",
    description: "App para registrar entrenamientos, rutinas, historial y progreso.",
    status: "Activo",
    access: "Invitación",
    href: "/apps/gym",
    focus: "Entrenamiento",
  },
  {
    name: "Fantasy",
    slug: "fantasy",
    description:
      "Fantasy privado de LaLiga con mercado, alineaciones, clasificación y reglas configurables.",
    status: "En desarrollo",
    access: "Invitación",
    href: "/apps/fantasy",
    focus: "Fútbol",
  },
  {
    name: "Recetario",
    slug: "recetas",
    description:
      "Recetas compartidas por recetarios familiares, con modo cocina e importación.",
    status: "Activo",
    access: "Invitación",
    href: "/apps/recetas",
    focus: "Organización personal",
  },
  {
    name: "TravelKit",
    slug: "travelkit",
    description: "Checklists personalizadas para preparar cada viaje. Secciones, progreso y plantillas reutilizables.",
    status: "Activo",
    access: "Invitación",
    href: "/apps/travelkit",
    focus: "Viajes",
  },
  {
    name: "Cine",
    slug: "cine",
    description:
      "PWA privada para elegir, guardar y valorar peliculas y series en pareja.",
    status: "En desarrollo",
    access: "Invitación",
    href: "/apps/cine",
    focus: "Cine y series",
  },
  {
    name: "FinanceLab",
    slug: "financelab",
    description:
      "Simuladores personales de ahorro, inversión, fiscalidad e hipoteca.",
    status: "Privado",
    access: "Solo Ramón",
    href: "/privado",
    focus: "Finanzas",
  },
  {
    name: "Mundial 2026",
    slug: "mundial",
    description:
      "Calendario, horarios en España, resultados y clasificaciones del Mundial.",
    status: "Activo",
    access: "Público",
    href: "/apps/mundial",
    focus: "Fútbol",
  },
  {
    name: "Real Madrid",
    slug: "madrid",
    description:
      "Seguimiento del Real Madrid: calendario, resultados, clasificación de LaLiga, plantilla y goleadores en todas las competiciones.",
    status: "Activo",
    access: "Público",
    href: "/apps/madrid",
    focus: "Fútbol",
  },
] as const satisfies readonly AppItem[];


