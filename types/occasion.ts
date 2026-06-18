export type OccasionGroup = "everyday" | "formal" | "social" | "cultural" | "weather";
export type Formality = "relaxed" | "balanced" | "polished" | "formal";

export type Occasion = {
  id: string;
  _id?: string;
  name: string;
  group: OccasionGroup;
  formality: Formality;
  description: string;
  icon: string;
  isGlobal?: boolean;
};
