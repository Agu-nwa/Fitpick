export type SessionUser = {
  userId: string;
  email: string;
  role: "user" | "admin";
  sessionId?: string;
};

export type SafeUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  timezone?: string;
  locale?: string;
  role: "user" | "admin";
  credits?: number;
  totalCreditsPurchased?: number;
  totalCreditsRefunded?: number;
  totalCreditsSpent?: number;
  complimentaryCreditsUsed?: number;
  modelSetupCompletedAt?: string;
  weatherLocationName?: string;
  weatherLatitude?: number;
  weatherLongitude?: number;
  weatherLocationUpdatedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
};
