export type ProfileKey = "RR" | "LB";

export type MediaKind = "movie" | "series";

export type MonetizationType = "included" | "rent" | "buy";

export type WatchStatus = "none" | "watching" | "watched" | "abandoned";

export type ProviderKey = "netflix" | "prime" | "movistar" | "max" | "disney";

export type PendingCategory =
  | "Para ver juntos"
  | "Pelis de RR"
  | "Pelis de LB"
  | "Series pendientes"
  | "Fin de semana"
  | "Alta prioridad";

export type Provider = {
  key: ProviderKey;
  name: string;
  shortName: string;
  accent: string;
};

export type Availability = {
  provider: ProviderKey;
  type: MonetizationType;
};

export type PersonalState = {
  rating?: number;
  status: WatchStatus;
  watchedAt?: string;
};

export type CineTitle = {
  id: string;
  tmdbId?: number;
  title: string;
  originalTitle?: string;
  searchTitles?: string[];
  kind: MediaKind;
  year: number;
  runtimeLabel: string;
  genres: string[];
  posterPath: string;
  backdropPath: string;
  overview: string;
  imdbRating?: number;
  imdbVotes?: number;
  tmdbPopularity: number;
  rtTomatometer?: number;
  rtPopcornmeter?: number;
  availability: Availability[];
  pendingCategories: PendingCategory[];
  addedBy?: ProfileKey;
  personal: Record<ProfileKey, PersonalState>;
};
