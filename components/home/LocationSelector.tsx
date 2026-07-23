"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, MapPin, Search, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  getLocationCities,
  getLocationCountries,
  updateWeatherLocation,
  type CurrentUserSummary,
  type LocationCity,
  type LocationCountry
} from "@/lib/api-client";
import { safeUserMessage } from "@/lib/user-facing-errors";

type LocationSelectorProps = {
  open: boolean;
  onClose: () => void;
  onSaved: (location: LocationCity, user?: CurrentUserSummary["user"]) => Promise<void> | void;
};

function cleanSearch(value: string) {
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trimStart().slice(0, 80);
}

export function LocationSelector({ open, onClose, onSaved }: LocationSelectorProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [countries, setCountries] = useState<LocationCountry[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<LocationCountry | null>(null);
  const [countrySearch, setCountrySearch] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [cities, setCities] = useState<LocationCity[]>([]);
  const [selectedCity, setSelectedCity] = useState<LocationCity | null>(null);
  const [countriesStatus, setCountriesStatus] = useState<"idle" | "loading" | "error">("idle");
  const [citiesStatus, setCitiesStatus] = useState<"idle" | "loading" | "error">("idle");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  const filteredCountries = useMemo(() => {
    const query = countrySearch.trim().toLowerCase();
    return countries.filter((country) => !query || country.name.toLowerCase().includes(query));
  }, [countries, countrySearch]);

  useEffect(() => {
    if (!open) return;

    setSaveStatus("idle");
    setMessage("");
    const timer = window.setTimeout(() => closeButtonRef.current?.focus(), 40);

    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open || countries.length) return;

    let active = true;
    setCountriesStatus("loading");
    void getLocationCountries().then((result) => {
      if (!active) return;
      if (result.ok) {
        setCountries(result.data.countries);
        setCountriesStatus("idle");
        return;
      }
      setCountriesStatus("error");
      setMessage(safeUserMessage(result.error, "Unable to load countries right now."));
    });

    return () => {
      active = false;
    };
  }, [countries.length, open]);

  useEffect(() => {
    if (!open || !selectedCountry) {
      setCities([]);
      setSelectedCity(null);
      setCitiesStatus("idle");
      return;
    }

    let active = true;
    setCitiesStatus("loading");
    const timer = window.setTimeout(() => {
      void getLocationCities({
        countryCode: selectedCountry.code,
        query: citySearch.trim(),
        limit: 20
      }).then((result) => {
        if (!active) return;
        if (result.ok) {
          setCities(result.data.cities);
          setCitiesStatus("idle");
          return;
        }
        setCities([]);
        setCitiesStatus("error");
        setMessage(safeUserMessage(result.error, "Unable to load cities right now."));
      });
    }, 280);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [citySearch, open, selectedCountry]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => element.offsetParent !== null);

      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  function chooseCountry(country: LocationCountry) {
    setSelectedCountry(country);
    setSelectedCity(null);
    setCitySearch("");
    setCities([]);
    setMessage("");
  }

  async function handleSave() {
    if (!selectedCountry || !selectedCity || saveStatus === "saving") return;

    setSaveStatus("saving");
    setMessage("Saving location...");
    const result = await updateWeatherLocation({
      countryCode: selectedCountry.code,
      cityId: selectedCity.id
    });

    if (result.ok) {
      setSaveStatus("saved");
      setMessage("Location saved.");
      await onSaved(result.data.location, result.data.user);
      return;
    }

    setSaveStatus("error");
    setMessage(safeUserMessage(result.error, "Unable to save your location right now."));
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/35 px-3 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm sm:items-center sm:p-6" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="home-location-title"
        aria-describedby="home-location-status"
        className="max-h-[88vh] w-full overflow-hidden rounded-t-[2rem] border border-line bg-surface shadow-2xl sm:max-w-xl sm:rounded-[2rem]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line bg-canvas/60 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cocoa">Dressing location</p>
            <h2 id="home-location-title" className="mt-1 text-xl font-semibold tracking-tight text-ink">Choose your city</h2>
            <p className="mt-1 text-sm leading-5 text-muted">City and country are enough for weather-aware styling.</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="focus-ring inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-white/80 text-muted hover:text-ink"
            aria-label="Close city selector"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="max-h-[64vh] space-y-5 overflow-y-auto px-5 py-5">
          <section aria-labelledby="country-label" className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label id="country-label" htmlFor="country-search" className="text-sm font-semibold text-ink">Country</label>
              {selectedCountry ? <span className="text-xs font-semibold text-olive">{selectedCountry.name}</span> : null}
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} aria-hidden="true" />
              <input
                id="country-search"
                value={countrySearch}
                onChange={(event) => setCountrySearch(cleanSearch(event.target.value))}
                className="focus-ring min-h-12 w-full rounded-2xl border border-line bg-white/80 pl-10 pr-3 text-sm text-ink shadow-inner"
                placeholder="Search countries"
                aria-controls="country-options"
                aria-describedby="home-location-status"
              />
            </div>
            <div id="country-options" role="listbox" aria-label="Country options" className="grid max-h-44 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              {countriesStatus === "loading" ? <p className="rounded-2xl border border-line bg-canvas/60 px-3 py-3 text-sm text-muted">Loading countries...</p> : null}
              {countriesStatus === "error" ? <p className="rounded-2xl border border-danger/20 bg-danger/10 px-3 py-3 text-sm text-ink">Unable to load countries.</p> : null}
              {countriesStatus === "idle" && filteredCountries.length === 0 ? <p className="rounded-2xl border border-line bg-canvas/60 px-3 py-3 text-sm text-muted">No countries found.</p> : null}
              {filteredCountries.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  role="option"
                  aria-selected={selectedCountry?.code === country.code}
                  onClick={() => chooseCountry(country)}
                  className="focus-ring flex min-h-12 items-center justify-between rounded-2xl border border-line bg-white/75 px-3 text-left text-sm font-semibold text-ink transition hover:border-olive/70 hover:bg-white aria-selected:border-olive aria-selected:bg-olive/10"
                >
                  <span>{country.name}</span>
                  {selectedCountry?.code === country.code ? <Check size={16} className="text-olive" aria-hidden="true" /> : null}
                </button>
              ))}
            </div>
          </section>

          <section aria-labelledby="city-label" className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label id="city-label" htmlFor="city-search" className="text-sm font-semibold text-ink">City</label>
              {selectedCity ? <span className="text-xs font-semibold text-olive">{selectedCity.cityName}</span> : null}
            </div>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} aria-hidden="true" />
              <input
                id="city-search"
                value={citySearch}
                onChange={(event) => setCitySearch(cleanSearch(event.target.value))}
                disabled={!selectedCountry}
                className="focus-ring min-h-12 w-full rounded-2xl border border-line bg-white/80 pl-10 pr-3 text-sm text-ink shadow-inner disabled:cursor-not-allowed disabled:opacity-60"
                placeholder={selectedCountry ? "Search cities" : "Choose a country first"}
                aria-controls="city-options"
                aria-describedby="home-location-status"
              />
            </div>
            <div id="city-options" role="listbox" aria-label="City options" className="grid max-h-48 gap-2 overflow-y-auto pr-1">
              {!selectedCountry ? <p className="rounded-2xl border border-line bg-canvas/60 px-3 py-3 text-sm text-muted">City search unlocks after country selection.</p> : null}
              {selectedCountry && citiesStatus === "loading" ? <p className="inline-flex items-center gap-2 rounded-2xl border border-line bg-canvas/60 px-3 py-3 text-sm text-muted"><Loader2 size={15} className="animate-spin" aria-hidden="true" /> Loading cities...</p> : null}
              {selectedCountry && citiesStatus === "error" ? <p className="rounded-2xl border border-danger/20 bg-danger/10 px-3 py-3 text-sm text-ink">Unable to load cities.</p> : null}
              {selectedCountry && citiesStatus === "idle" && cities.length === 0 ? <p className="rounded-2xl border border-line bg-canvas/60 px-3 py-3 text-sm text-muted">No cities found.</p> : null}
              {cities.map((city) => (
                <button
                  key={city.id}
                  type="button"
                  role="option"
                  aria-selected={selectedCity?.id === city.id}
                  onClick={() => {
                    setSelectedCity(city);
                    setMessage("");
                  }}
                  className="focus-ring flex min-h-12 items-center justify-between rounded-2xl border border-line bg-white/75 px-3 text-left text-sm font-semibold text-ink transition hover:border-olive/70 hover:bg-white aria-selected:border-olive aria-selected:bg-olive/10"
                >
                  <span>{city.cityName}</span>
                  {selectedCity?.id === city.id ? <Check size={16} className="text-olive" aria-hidden="true" /> : null}
                </button>
              ))}
            </div>
          </section>

          <p id="home-location-status" aria-live="polite" className="min-h-5 text-sm text-muted">
            {message || (selectedCity ? `${selectedCity.cityName}, ${selectedCity.countryName} selected.` : "Choose a country, then choose a city.")}
          </p>
        </div>

        <div className="grid gap-3 border-t border-line bg-canvas/70 px-5 py-4 sm:grid-cols-[1fr_auto]">
          <Button variant="secondary" onClick={onClose} className="rounded-full">Close</Button>
          <Button onClick={() => void handleSave()} disabled={!selectedCountry || !selectedCity || saveStatus === "saving"} className="rounded-full">
            {saveStatus === "saving" ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
            {saveStatus === "saving" ? "Saving location" : "Save city"}
          </Button>
        </div>
      </div>
    </div>
  );
}
