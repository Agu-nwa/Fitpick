export type GreetingPeriod = "morning" | "afternoon" | "evening" | "night";

export type EditorialGreetingUser = {
  id?: string;
  displayName?: string | null;
  firstName?: string | null;
  accountName?: string | null;
  name?: string | null;
  email?: string | null;
};

export type EditorialGreeting = {
  period: GreetingPeriod;
  greeting: string;
  message: string;
  displayName: string;
};

const editorialMessages: Record<GreetingPeriod, string[]> = {
  morning: [
    "Let's create something worth wearing today.",
    "Today's best look starts here.",
    "Style starts before the day does.",
    "Your wardrobe is ready when you are.",
    "Begin the day with intention.",
    "A fresh day deserves a considered look."
  ],
  afternoon: [
    "Let's dress for what's next.",
    "Your next look is waiting.",
    "There's still time for a great outfit.",
    "Keep the day looking considered.",
    "One thoughtful look can change the day.",
    "Continue the day in style."
  ],
  evening: [
    "Let's dress for what's next.",
    "The evening deserves a better outfit.",
    "Wherever you're headed, arrive in style.",
    "Your evening look starts here.",
    "Make the next moment count.",
    "Dress for the moments ahead."
  ],
  night: [
    "Tomorrow's style begins tonight.",
    "Curate tomorrow before you unwind.",
    "Great style is often planned ahead.",
    "Prepare tomorrow with intention.",
    "Your next day starts here.",
    "Style begins before morning arrives."
  ]
};

const genericNames = new Set(["user", "fitpick user", "myfitpick user", "null", "undefined"]);

function cleanNameCandidate(value: unknown) {
  if (typeof value !== "string") return "";
  const clean = value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
  if (!clean || clean.includes("@") || genericNames.has(clean.toLowerCase())) return "";
  return clean;
}

function firstNameFrom(value: string) {
  const first = value.split(/\s+/)[0]?.replace(/[^A-Za-z'-]/g, "").trim() || "";
  return cleanNameCandidate(first);
}

export function displayNameForGreeting(user?: EditorialGreetingUser | null) {
  if (!user) return "";

  const record = user as EditorialGreetingUser & Record<string, unknown>;
  const displayName = cleanNameCandidate(record.displayName);
  if (displayName) return displayName;

  const explicitFirstName = cleanNameCandidate(record.firstName);
  if (explicitFirstName) return explicitFirstName;

  const derivedFirstName = firstNameFrom(cleanNameCandidate(record.name));
  if (derivedFirstName) return derivedFirstName;

  const accountName = cleanNameCandidate(record.accountName);
  if (accountName) return accountName;

  return "";
}

export function greetingPeriodForDate(date: Date): GreetingPeriod {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

export function salutationForPeriod(period: GreetingPeriod) {
  if (period === "morning") return "Good morning";
  if (period === "afternoon") return "Good afternoon";
  return "Good evening";
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function editorialMessageForDate(period: GreetingPeriod, date: Date, userKey = "guest") {
  const messages = editorialMessages[period];
  const index = stableHash(`${localDateKey(date)}:${period}:${userKey || "guest"}`) % messages.length;
  return messages[index];
}

export function buildEditorialGreeting(date: Date, user?: EditorialGreetingUser | null): EditorialGreeting {
  const period = greetingPeriodForDate(date);
  const displayName = displayNameForGreeting(user);
  const salutation = salutationForPeriod(period);
  return {
    period,
    displayName,
    greeting: displayName ? `${salutation}, ${displayName}.` : `${salutation}.`,
    message: editorialMessageForDate(period, date, user?.id || displayName || "guest")
  };
}

export function msUntilNextGreetingRefresh(date: Date) {
  const nextPeriod = new Date(date);
  const hour = date.getHours();

  if (hour < 5) nextPeriod.setHours(5, 0, 1, 0);
  else if (hour < 12) nextPeriod.setHours(12, 0, 1, 0);
  else if (hour < 17) nextPeriod.setHours(17, 0, 1, 0);
  else if (hour < 21) nextPeriod.setHours(21, 0, 1, 0);
  else {
    nextPeriod.setDate(nextPeriod.getDate() + 1);
    nextPeriod.setHours(5, 0, 1, 0);
  }

  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  nextDay.setHours(0, 0, 1, 0);

  return Math.max(1000, Math.min(nextPeriod.getTime(), nextDay.getTime()) - date.getTime());
}
