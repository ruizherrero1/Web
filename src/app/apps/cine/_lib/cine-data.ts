import type { CineTitle, PendingCategory, Provider } from "./types";

export const profiles = [
  {
    key: "RR",
    name: "Ramon",
  },
  {
    key: "LB",
    name: "Laura",
  }
] as const;

export const providers: Provider[] = [
  { key: "netflix", name: "Netflix", shortName: "N", accent: "#e50914" },
  { key: "prime", name: "Prime Video", shortName: "PV", accent: "#00a8e1" },
  { key: "movistar", name: "Movistar Plus+", shortName: "M+", accent: "#00a9e0" },
  { key: "max", name: "Max", shortName: "Max", accent: "#7b61ff" },
  { key: "disney", name: "Disney+", shortName: "D+", accent: "#19c6ff" }
];

export const pendingCategories: PendingCategory[] = [
  "Para ver juntos",
  "Pelis de RR",
  "Pelis de LB",
  "Series pendientes",
  "Fin de semana",
  "Alta prioridad"
];

export const demoTitles: CineTitle[] = [
  {
    id: "dune-part-two",
    title: "Dune: Parte dos",
    kind: "movie",
    year: 2024,
    runtimeLabel: "2h 46m",
    genres: ["Ciencia ficcion", "Aventura", "Drama"],
    posterPath: "/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
    backdropPath: "/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg",
    overview: "Paul Atreides une fuerzas con Chani y los Fremen mientras busca venganza y acepta un destino enorme.",
    imdbRating: 8.5,
    imdbVotes: 640000,
    tmdbPopularity: 94,
    rtTomatometer: 92,
    rtPopcornmeter: 95,
    availability: [
      { provider: "max", type: "included" },
      { provider: "prime", type: "rent" }
    ],
    pendingCategories: ["Para ver juntos", "Alta prioridad"],
    addedBy: "LB",
    personal: {
      RR: { status: "none" },
      LB: { status: "none" }
    }
  },
  {
    id: "the-bear",
    title: "The Bear",
    kind: "series",
    year: 2022,
    runtimeLabel: "3 temporadas",
    genres: ["Drama", "Comedia"],
    posterPath: "/sHFlbKS3WLqMnp9t2ghADIJFnuQ.jpg",
    backdropPath: "/xubSaZ8np6aYJpLw8p5lQL0l6kC.jpg",
    overview: "Un chef joven vuelve a Chicago para hacerse cargo del local familiar y de todo lo que arde alrededor.",
    imdbRating: 8.6,
    imdbVotes: 290000,
    tmdbPopularity: 88,
    rtTomatometer: 96,
    rtPopcornmeter: 84,
    availability: [{ provider: "disney", type: "included" }],
    pendingCategories: ["Series pendientes", "Para ver juntos"],
    addedBy: "RR",
    personal: {
      RR: { status: "watching", rating: 8 },
      LB: { status: "watching", rating: 9 }
    }
  },
  {
    id: "oppenheimer",
    title: "Oppenheimer",
    kind: "movie",
    year: 2023,
    runtimeLabel: "3h 00m",
    genres: ["Drama", "Historia", "Biografia"],
    posterPath: "/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    backdropPath: "/rLb2cwF3Pazuxaj0sRXQ037tGI1.jpg",
    overview: "La historia del fisico que lidero el Proyecto Manhattan y del precio moral de cambiar la historia.",
    imdbRating: 8.3,
    imdbVotes: 930000,
    tmdbPopularity: 78,
    rtTomatometer: 93,
    rtPopcornmeter: 91,
    availability: [
      { provider: "movistar", type: "included" },
      { provider: "prime", type: "buy" }
    ],
    pendingCategories: ["Fin de semana"],
    addedBy: "RR",
    personal: {
      RR: { status: "watched", rating: 8, watchedAt: "2026-06-21" },
      LB: { status: "watched", rating: 7, watchedAt: "2026-06-21" }
    }
  },
  {
    id: "fallout",
    title: "Fallout",
    kind: "series",
    year: 2024,
    runtimeLabel: "1 temporada",
    genres: ["Ciencia ficcion", "Accion", "Aventura"],
    posterPath: "/AnsSKR9LuK0T9bAOcPVA3PUvyWj.jpg",
    backdropPath: "/yY76zq9XSuJ4nWyPDuwkdV7Wt0c.jpg",
    overview: "Refugios, superficie y poder chocan en una adaptacion postapocaliptica con humor negro.",
    imdbRating: 8.3,
    imdbVotes: 270000,
    tmdbPopularity: 91,
    rtTomatometer: 94,
    rtPopcornmeter: 90,
    availability: [{ provider: "prime", type: "included" }],
    pendingCategories: ["Series pendientes", "Alta prioridad"],
    addedBy: "LB",
    personal: {
      RR: { status: "none" },
      LB: { status: "none" }
    }
  },
  {
    id: "society-of-the-snow",
    title: "La sociedad de la nieve",
    kind: "movie",
    year: 2023,
    runtimeLabel: "2h 24m",
    genres: ["Drama", "Supervivencia"],
    posterPath: "/2e853FDVSIso600RqAMunPxiZjq.jpg",
    backdropPath: "/uUiIGztTrfDhPdAFJpr6m4UBMAd.jpg",
    overview: "Los supervivientes de un accidente aereo en los Andes se enfrentan al frio, el hambre y lo imposible.",
    imdbRating: 7.8,
    imdbVotes: 150000,
    tmdbPopularity: 66,
    rtTomatometer: 90,
    rtPopcornmeter: 83,
    availability: [{ provider: "netflix", type: "included" }],
    pendingCategories: ["Para ver juntos"],
    addedBy: "RR",
    personal: {
      RR: { status: "watched", rating: 9, watchedAt: "2026-01-13" },
      LB: { status: "watched", rating: 9, watchedAt: "2026-01-13" }
    }
  },
  {
    id: "poor-things",
    title: "Pobres criaturas",
    kind: "movie",
    year: 2023,
    runtimeLabel: "2h 22m",
    genres: ["Fantasia", "Comedia", "Drama"],
    posterPath: "/kCGlIMHnOm8JPXq3rXM6c5wMxcT.jpg",
    backdropPath: "/9oYdz5gDoIl8h67e3ccv3OHtmm2.jpg",
    overview: "Bella Baxter recorre un mundo salvaje, brillante y extrano con una curiosidad feroz.",
    imdbRating: 7.8,
    imdbVotes: 330000,
    tmdbPopularity: 72,
    rtTomatometer: 92,
    rtPopcornmeter: 79,
    availability: [
      { provider: "disney", type: "included" },
      { provider: "prime", type: "rent" }
    ],
    pendingCategories: ["Pelis de LB", "Fin de semana"],
    addedBy: "LB",
    personal: {
      RR: { status: "none" },
      LB: { status: "none" }
    }
  }
];

