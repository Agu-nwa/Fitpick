"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "@/hooks/use-session";
import { buildEditorialGreeting, msUntilNextGreetingRefresh } from "@/lib/editorial-greeting";

const fallbackGreeting = {
  greeting: "Good to see you.",
  message: "Your private styling studio is ready."
};

export function DynamicEditorialGreeting() {
  const session = useSession();
  const [localDate, setLocalDate] = useState<Date | null>(null);

  useEffect(() => {
    let timer: number | undefined;

    function refreshGreeting() {
      const nextDate = new Date();
      setLocalDate(nextDate);
      timer = window.setTimeout(refreshGreeting, msUntilNextGreetingRefresh(nextDate));
    }

    refreshGreeting();
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  const greeting = useMemo(() => {
    if (!localDate) return fallbackGreeting;
    return buildEditorialGreeting(localDate, session.user);
  }, [localDate, session.user]);

  return (
    <>
      <h1
        suppressHydrationWarning
        className="font-editorial text-balance text-4xl font-semibold leading-[0.98] tracking-editorial text-ink sm:text-5xl lg:text-6xl"
      >
        {greeting.greeting}
      </h1>
      <p suppressHydrationWarning className="mt-4 max-w-xl text-pretty text-sm leading-6 text-muted sm:text-base">
        {greeting.message}
      </p>
    </>
  );
}
