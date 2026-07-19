"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, ImagePlus, MapPin, ScanFace, ShieldCheck, Sparkles } from "lucide-react";
import { AuthEntryForm } from "@/components/auth/AuthEntryForm";
import { LoadingCard } from "@/components/integration/LoadingCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { useSession } from "@/hooks/use-session";
import { getAvatarProfile, requestSignedUploadUrl, updateAvatarProfile, updateCurrentUser, updatePreferences } from "@/lib/api-client";

const inputClass =
  "focus-ring min-h-11 w-full rounded-2xl border border-line bg-canvas/80 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted";
const modelMimeTypes = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"]);
const maxModelPhotoBytes = 8 * 1024 * 1024;
const otherLocation = "Other";
const dressingLocationOptions = [
  { country: "Nigeria", cities: ["Lagos", "Abuja", "Port Harcourt", "Ibadan"] },
  { country: "Ghana", cities: ["Accra", "Kumasi", "Takoradi"] },
  { country: "South Africa", cities: ["Johannesburg", "Cape Town", "Durban"] },
  { country: "United Kingdom", cities: ["London", "Manchester", "Birmingham"] },
  { country: "United States", cities: ["New York", "Los Angeles", "Chicago", "Houston", "Atlanta"] },
  { country: "Canada", cities: ["Toronto", "Vancouver", "Montreal", "Calgary"] },
  { country: "United Arab Emirates", cities: ["Dubai", "Abu Dhabi", "Sharjah"] },
  { country: "France", cities: ["Paris", "Lyon", "Marseille"] },
  { country: "Germany", cities: ["Berlin", "Munich", "Hamburg"] },
  { country: "Sweden", cities: ["Stockholm", "Gothenburg", "Malmo"] },
  { country: "Italy", cities: ["Milan", "Rome", "Florence"] },
  { country: "Spain", cities: ["Madrid", "Barcelona", "Valencia"] }
];

function previewBackground(url: string) {
  return { backgroundImage: `url("${url.replace(/"/g, "%22")}")` };
}

function cleanLocationPart(value: string) {
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
}

function formatLocation(city: string, country: string) {
  const cleanCity = cleanLocationPart(city);
  const cleanCountry = cleanLocationPart(country);
  return [cleanCity, cleanCountry].filter(Boolean).join(", ");
}

function locationFromSaved(value: string) {
  const cleaned = cleanLocationPart(value);
  if (!cleaned || cleaned === "Current location") return { country: "", city: "", custom: cleaned };

  const [cityPart, ...countryParts] = cleaned.split(",").map((part) => part.trim()).filter(Boolean);
  const countryPart = countryParts.join(", ");
  const countryOption = dressingLocationOptions.find((option) => option.country.toLowerCase() === countryPart.toLowerCase());
  const cityOption = countryOption?.cities.find((city) => city.toLowerCase() === cityPart.toLowerCase());

  if (countryOption && cityOption) return { country: countryOption.country, city: cityOption, custom: "" };
  return { country: otherLocation, city: otherLocation, custom: cleaned };
}

export function EssentialModelSetup() {
  const router = useRouter();
  const session = useSession();
  const modelFileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [genderPresentation, setGenderPresentation] = useState("neutral");
  const [bodyPreset, setBodyPreset] = useState("average");
  const [heightPreset, setHeightPreset] = useState("");
  const [bodyFitPreference, setBodyFitPreference] = useState("regular");
  const [shoeSize, setShoeSize] = useState("");
  const [styleIdentity, setStyleIdentity] = useState("clean, polished");
  const [weatherLocationName, setWeatherLocationName] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [customLocation, setCustomLocation] = useState("");
  const [weatherLatitude, setWeatherLatitude] = useState<number | null>(null);
  const [weatherLongitude, setWeatherLongitude] = useState<number | null>(null);
  const [uploadedModelImageUrl, setUploadedModelImageUrl] = useState("");
  const [uploadedModelImageStorageKey, setUploadedModelImageStorageKey] = useState("");
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingModel, setUploadingModel] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (session.user?.name) setName(session.user.name);
    if (session.user?.weatherLocationName) {
      const saved = locationFromSaved(session.user.weatherLocationName);
      setWeatherLocationName(session.user.weatherLocationName);
      setSelectedCountry(saved.country);
      setSelectedCity(saved.city);
      setCustomLocation(saved.custom);
    }
    if (typeof session.user?.weatherLatitude === "number") setWeatherLatitude(session.user.weatherLatitude);
    if (typeof session.user?.weatherLongitude === "number") setWeatherLongitude(session.user.weatherLongitude);
  }, [session.user]);

  const selectedCountryOption = dressingLocationOptions.find((option) => option.country === selectedCountry);
  const cityOptions = selectedCountryOption?.cities || [];
  const usesCustomLocation = selectedCountry === otherLocation || selectedCity === otherLocation;

  useEffect(() => {
    if (session.status !== "authenticated") return;
    let mounted = true;

    void getAvatarProfile().then((result) => {
      if (!mounted || !result.ok) return;
      const profile = result.data.profile;
      setGenderPresentation(profile.genderPresentation);
      setBodyPreset(profile.bodyPreset);
      setHeightPreset(profile.heightPreset || "");
      setBodyFitPreference(profile.bodyFitPreference || "regular");
      setShoeSize(profile.shoeSize || "");
      setUploadedModelImageUrl(profile.uploadedModelImageUrl || "");
      setUploadedModelImageStorageKey(profile.uploadedModelImageStorageKey || "");
      setConsentAccepted(profile.consentAccepted);
    });

    return () => {
      mounted = false;
    };
  }, [session.status]);

  function useCurrentLocation() {
    setError("");
    setMessage("");
    if (!navigator.geolocation) {
      setError("Location is not available in this browser. Add a city instead.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setWeatherLatitude(Math.round(position.coords.latitude * 10000) / 10000);
        setWeatherLongitude(Math.round(position.coords.longitude * 10000) / 10000);
        setWeatherLocationName("Current location");
        setSelectedCountry("");
        setSelectedCity("");
        setCustomLocation("Current location");
        setMessage("Location added. You can change it later in Profile.");
      },
      () => setError("Location permission was not granted. Choose your city from the list."),
      { enableHighAccuracy: false, maximumAge: 30 * 60 * 1000, timeout: 8000 }
    );
  }

  function chooseCountry(value: string) {
    setSelectedCountry(value);
    setSelectedCity("");
    setWeatherLatitude(null);
    setWeatherLongitude(null);
    if (!value) {
      setWeatherLocationName("");
      setCustomLocation("");
      return;
    }
    if (value === otherLocation) {
      setSelectedCity(otherLocation);
      setWeatherLocationName(customLocation);
      return;
    }
    setCustomLocation("");
    setWeatherLocationName("");
  }

  function chooseCity(value: string) {
    setSelectedCity(value);
    setWeatherLatitude(null);
    setWeatherLongitude(null);
    if (!selectedCountry || !value) {
      setWeatherLocationName("");
      return;
    }
    if (value === otherLocation) {
      setCustomLocation("");
      setWeatherLocationName("");
      return;
    }
    setWeatherLocationName(formatLocation(value, selectedCountry));
  }

  function updateCustomLocation(value: string) {
    const cleaned = cleanLocationPart(value);
    setCustomLocation(value);
    setWeatherLocationName(cleaned);
    setWeatherLatitude(null);
    setWeatherLongitude(null);
  }

  async function handleModelPhoto(file: File) {
    setError("");
    setMessage("");

    const mimeType = file.type || "image/jpeg";
    if (!modelMimeTypes.has(mimeType)) {
      setError("Choose a JPG, PNG, WebP, or HEIC full-body photo.");
      return;
    }
    if (file.size > maxModelPhotoBytes) {
      setError("Choose a full-body photo under 8 MB.");
      return;
    }
    if (!consentAccepted) {
      setError("Accept preview consent before uploading your model photo.");
      return;
    }

    setUploadingModel(true);
    try {
      const signed = await requestSignedUploadUrl({
        filename: file.name,
        mimeType,
        sizeBytes: file.size,
        purpose: "avatar_model"
      });
      if (!signed.ok) throw new Error(signed.error.message);

      const uploadAccess = signed.data.upload;
      if (!uploadAccess.ready || !uploadAccess.uploadUrl) {
        throw new Error(uploadAccess.message || "Image upload is not configured yet.");
      }

      const uploadResponse = await fetch(uploadAccess.uploadUrl, {
        method: uploadAccess.method || "PUT",
        headers: uploadAccess.headers || { "content-type": mimeType },
        body: file
      });
      if (!uploadResponse.ok) throw new Error("We could not upload your model photo.");

      const imageUrl = uploadAccess.publicUrl || uploadAccess.uploadUrl.split("?")[0] || "";
      const avatarResult = await updateAvatarProfile({
        tryOnModelSource: "uploaded",
        uploadedModelImageUrl: imageUrl,
        uploadedModelImageStorageKey: uploadAccess.storageKey,
        consentAccepted: true
      });
      if (!avatarResult.ok) throw new Error(avatarResult.error.message || "Unable to save your model photo.");

      setUploadedModelImageUrl(avatarResult.data.profile.uploadedModelImageUrl || imageUrl);
      setUploadedModelImageStorageKey(avatarResult.data.profile.uploadedModelImageStorageKey || uploadAccess.storageKey);
      setConsentAccepted(true);
      setMessage("Full-body model photo saved.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload your model photo.");
    } finally {
      setUploadingModel(false);
    }
  }

  async function saveSetup(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!uploadedModelImageUrl || !uploadedModelImageStorageKey) {
      setError("Upload a full-body model photo before entering MyFitPick.");
      return;
    }
    if (!consentAccepted) {
      setError("Accept preview consent before entering MyFitPick.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    const avatarResult = await updateAvatarProfile({
      genderPresentation,
      bodyPreset,
      heightPreset: heightPreset || null,
      bodyFitPreference,
      shoeSize: shoeSize || null,
      bodyMeasurementSource: shoeSize ? "manual" : "unknown",
      bodyMeasurementConfidence: shoeSize ? 0.8 : 0,
      tryOnModelSource: "uploaded",
      uploadedModelImageUrl,
      uploadedModelImageStorageKey,
      consentAccepted: true
    });

    if (!avatarResult.ok) {
      setSaving(false);
      setError("We could not save your model photo. Check the upload and try again.");
      return;
    }

    const [preferencesResult, userResult] = await Promise.all([
      updatePreferences({
        styleIdentity: styleIdentity
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
          .slice(0, 8)
      }),
      updateCurrentUser({
        name,
        weatherLocationName,
        weatherLatitude,
        weatherLongitude,
        modelSetupCompleted: true
      })
    ]);

    setSaving(false);

    if (!userResult.ok || !avatarResult.ok || !preferencesResult.ok) {
      setError("We could not save your setup. Check the fields and try again.");
      return;
    }

    await session.refresh();
    router.push("/home");
    router.refresh();
  }

  if (session.status === "loading") return <LoadingCard title="Preparing setup" />;

  if (session.status === "logged-out") {
    return (
      <Card className="space-y-4">
        <div>
          <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-cocoa">
            <Sparkles size={14} aria-hidden="true" />
            Create account
          </p>
          <h2 className="font-editorial mt-2 text-3xl font-semibold leading-none text-ink">Start with your account.</h2>
          <p className="mt-2 text-sm leading-6 text-muted">After email verification, MyFitPick will help you set up your model in a few simple choices.</p>
        </div>
        <AuthEntryForm compact initialMode="signup" />
      </Card>
    );
  }

  return (
    <Card className="space-y-5">
      <div>
        <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-cocoa">
          <ScanFace size={14} aria-hidden="true" />
          Model setup
        </p>
        <h2 className="font-editorial mt-2 text-3xl font-semibold leading-none text-ink">Create your model.</h2>
        <p className="mt-2 text-sm leading-6 text-muted">A few details and a full-body model photo help MyFitPick style your wardrobe, power virtual try-ons, and keep weather suggestions useful.</p>
      </div>

      {message ? <p className="rounded-2xl border border-success/25 bg-success/10 px-3 py-2 text-xs font-semibold text-ink">{message}</p> : null}
      {error ? <p className="rounded-2xl border border-danger/25 bg-danger/10 px-3 py-2 text-xs font-semibold text-ink">{error}</p> : null}

      <form className="space-y-4" onSubmit={saveSetup}>
        <FieldGroup label="Display name" htmlFor="setup-name" required>
          <input id="setup-name" className={inputClass} required minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} />
        </FieldGroup>

        <div className="grid gap-3 sm:grid-cols-2">
          <FieldGroup label="Avatar base" htmlFor="setup-presentation">
            <select id="setup-presentation" className={inputClass} value={genderPresentation} onChange={(event) => setGenderPresentation(event.target.value)}>
              <option value="neutral">Not specified</option>
              <option value="masculine">Male</option>
              <option value="feminine">Female</option>
            </select>
          </FieldGroup>
          <FieldGroup label="Body shape" htmlFor="setup-body">
            <select id="setup-body" className={inputClass} value={bodyPreset} onChange={(event) => setBodyPreset(event.target.value)}>
              <option value="average">Average</option>
              <option value="slim">Slim</option>
              <option value="athletic">Athletic</option>
              <option value="curvy">Curvy</option>
              <option value="plus">Plus</option>
            </select>
          </FieldGroup>
          <FieldGroup label="Height range" htmlFor="setup-height">
            <select id="setup-height" className={inputClass} value={heightPreset} onChange={(event) => setHeightPreset(event.target.value)}>
              <option value="">Not specified</option>
              <option value="short">Short</option>
              <option value="average">Average</option>
              <option value="tall">Tall</option>
            </select>
          </FieldGroup>
          <FieldGroup label="Preferred fit" htmlFor="setup-fit">
            <select id="setup-fit" className={inputClass} value={bodyFitPreference} onChange={(event) => setBodyFitPreference(event.target.value)}>
              <option value="true_to_size">True to size</option>
              <option value="slim">Slim</option>
              <option value="regular">Regular</option>
              <option value="relaxed">Relaxed</option>
              <option value="oversized">Oversized</option>
            </select>
          </FieldGroup>
        </div>

        <section className="space-y-4 rounded-xl3 border border-cocoa/20 bg-cocoa/5 p-4">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-cocoa">
              <Camera size={14} aria-hidden="true" />
              Full-body model photo
            </p>
            <p className="mt-1 text-xs leading-5 text-muted">
              Required for virtual try-on. The image must show your full body, from head to feet. You can upload a photo you already have or take a new one.
            </p>
          </div>
          <label className="flex gap-3 rounded-2xl border border-line bg-surface/80 p-3 text-sm leading-6 text-ink">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-cocoa"
              checked={consentAccepted}
              onChange={(event) => setConsentAccepted(event.target.checked)}
            />
            <span>
              I understand this photo is used for MyFitPick preview and virtual try-on features.
            </span>
          </label>
          <input
            ref={modelFileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.currentTarget.value = "";
              if (file) void handleModelPhoto(file);
            }}
          />
          <div className="grid gap-3 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)] sm:items-stretch">
            <div className="rounded-2xl border border-line bg-surface/70 p-3">
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-muted">
                <ImagePlus size={14} aria-hidden="true" />
                Required image
              </p>
              {uploadedModelImageUrl ? (
                <div
                  role="img"
                  aria-label="Uploaded full-body model photo"
                  className="mt-3 aspect-[3/4] w-full rounded-xl bg-cover bg-center"
                  style={previewBackground(uploadedModelImageUrl)}
                />
              ) : (
                <div className="mt-3 flex aspect-[3/4] w-full items-center justify-center rounded-xl border border-dashed border-line bg-canvas/60 px-4 text-center text-xs font-semibold text-muted">
                  No full-body photo uploaded yet
                </div>
              )}
            </div>
            <div className="flex flex-col justify-between gap-3 rounded-2xl border border-line bg-surface/70 p-3">
              <div className="space-y-2">
                <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-muted">
                  <ShieldCheck size={14} aria-hidden="true" />
                  Photo guide
                </p>
                <p className="text-xs leading-5 text-muted">Use a full-body image where your head, torso, legs, and feet are visible. Good lighting helps MyFitPick create a cleaner preview.</p>
                {!uploadedModelImageUrl ? (
                  <p className="rounded-2xl border border-warning/20 bg-warning/10 px-3 py-2 text-xs font-semibold text-ink">Required to finish setup.</p>
                ) : null}
              </div>
              <Button type="button" variant="secondary" className="w-full" disabled={uploadingModel || saving || !consentAccepted} onClick={() => modelFileInputRef.current?.click()}>
                {uploadingModel ? "Uploading..." : uploadedModelImageUrl ? "Replace full-body photo" : "Upload full-body photo"}
              </Button>
            </div>
          </div>
        </section>

        <FieldGroup label="Shoe size" htmlFor="setup-shoe" help="Optional. This helps MyFitPick complete looks with footwear.">
          <input id="setup-shoe" className={inputClass} value={shoeSize} onChange={(event) => setShoeSize(event.target.value)} placeholder="EU 43 / US 10" />
        </FieldGroup>

        <FieldGroup label="Style words" htmlFor="setup-style" help="Optional. Use a few words separated by commas.">
          <input id="setup-style" className={inputClass} value={styleIdentity} onChange={(event) => setStyleIdentity(event.target.value)} placeholder="clean, polished, relaxed" />
        </FieldGroup>

        <div className="rounded-2xl border border-line bg-canvas/60 p-3">
          <div className="mb-3">
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-cocoa">
              <MapPin size={14} aria-hidden="true" />
              Dressing location
            </p>
            <p className="mt-1 text-xs leading-5 text-muted">Choose your usual city and country for weather-aware suggestions. No address needed.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FieldGroup label="Country" htmlFor="setup-country" help="Used for weather-aware outfit suggestions.">
              <select id="setup-country" className={inputClass} value={selectedCountry} onChange={(event) => chooseCountry(event.target.value)}>
                <option value="">Choose country</option>
                {dressingLocationOptions.map((option) => (
                  <option key={option.country} value={option.country}>{option.country}</option>
                ))}
                <option value={otherLocation}>Other country</option>
              </select>
            </FieldGroup>
            <FieldGroup label="City" htmlFor="setup-city" help="City is enough. No precise address needed.">
              <select id="setup-city" className={inputClass} value={selectedCity} onChange={(event) => chooseCity(event.target.value)} disabled={!selectedCountry}>
                <option value="">{selectedCountry ? "Choose city" : "Choose country first"}</option>
                {cityOptions.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
                {selectedCountry ? <option value={otherLocation}>Other city</option> : null}
              </select>
            </FieldGroup>
          </div>
          {usesCustomLocation ? (
            <FieldGroup label="City and country" htmlFor="setup-custom-location" help="Use this only if your city is not listed." className="mt-3">
              <input id="setup-custom-location" className={inputClass} value={customLocation} onChange={(event) => updateCustomLocation(event.target.value)} placeholder="City, country" />
            </FieldGroup>
          ) : null}
          <Button type="button" variant="secondary" className="mt-3 w-full" onClick={useCurrentLocation} disabled={saving}>
            <MapPin size={16} aria-hidden="true" />
            Use current location
          </Button>
        </div>

        <Button type="submit" className="w-full" disabled={saving || uploadingModel || !uploadedModelImageUrl || !consentAccepted}>
          {saving ? "Saving..." : "Enter MyFitPick"}
        </Button>
      </form>
    </Card>
  );
}
