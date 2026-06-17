export type PlanName = "free" | "plus";

export type PlusStatus = {
  plan: PlanName;
  status: "active" | "inactive" | "trialing" | "past_due" | "canceled";
  featureLimits: {
    dailyPicks: number;
    wardrobeItems: number;
    savedLooks: number;
  };
};
