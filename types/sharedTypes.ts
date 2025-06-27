// tripify/types/sharedTypes.ts

export interface Country {
  id: string;
  cca2: string;
  name: string;
  flag: string;
  class: string | null;
  path: string;
  continent?: string;
}

export interface RankingSlot {
  id: string;
  rank: number;
  country: Country | null;
}
