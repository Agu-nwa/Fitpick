export type OnboardingTipId = "closet" | "create-look" | "match-outfit" | "virtual-try-on";
export type GettingStartedTaskId = "upload-first-item" | "create-first-look" | "match-first-item" | "generate-first-tryon";

export type GettingStartedTask = {
  id: GettingStartedTaskId;
  title: string;
  href: string;
  completed: boolean;
  completedAt: string | null;
};

export type OnboardingState = {
  welcomeCompleted: boolean;
  welcomeCompletedAt: string | null;
  checklistDismissedAt: string | null;
  dismissedTips: OnboardingTipId[];
  tasks: GettingStartedTask[];
  completedCount: number;
  totalCount: number;
  allComplete: boolean;
  shouldShowChecklist: boolean;
};
