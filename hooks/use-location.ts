"use client";

import { useEffect, useState } from "react";

export function useLocation() {
  const [location, setLocation] =
    useState<{
      latitude: number;
      longitude: number;
    } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude:
            position.coords.latitude,

          longitude:
            position.coords.longitude
        });
      },
      () => {},
      {
        enableHighAccuracy: true
      }
    );
  }, []);

  return location;
}
