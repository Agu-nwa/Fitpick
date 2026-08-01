"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Camera, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AppearancePresetPicker } from "@/components/avatar/AppearancePresetPicker";
import { generateAppearancePreview, updateAvatarProfile, type AvatarProfileData } from "@/lib/api-client";
import { hairColorPresets, skinTonePresets, type HairColorPreset, type SkinTonePreset } from "@/lib/avatar/appearance-presets";
import { getStudioModelOptions, type StudioModelGender, type StudioModelType } from "@/lib/avatar/studio-models";
import { safeUserMessage } from "@/lib/user-facing-errors";
import { cn } from "@/lib/utils";

type AvatarProfile = AvatarProfileData["profile"];

function modelLabel(gender?: string | null, type?: string | null) {
  if (!gender || !type) return "No Studio Model selected";
  return `${gender === "male" ? "Male" : "Female"} ${type.replace(/-/g, " ")}`;
}

export function AvatarProfileForm({
  profile,
  onSaved
}: {
  profile: AvatarProfile;
  onSaved: (profile: AvatarProfile) => void;
}) {
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [studioGender, setStudioGender] = useState<StudioModelGender | "">(profile.studioModelGender || "");
  const [studioModelType, setStudioModelType] = useState<StudioModelType | "">(profile.studioModelType || "");
  const [skinTonePreset, setSkinTonePreset] = useState<SkinTonePreset>(profile.skinTonePreset || "no-preference");
  const [hairColorPreset, setHairColorPreset] = useState<HairColorPreset>(profile.hairColorPreset || "no-preference");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [appearanceStatus, setAppearanceStatus] = useState<"idle" | "saving" | "generating" | "saved" | "error">("idle");
  const [previewUrl, setPreviewUrl] = useState(profile.generatedModelAppearanceKey && profile.generatedModelImageUrl ? profile.generatedModelImageUrl : "");
  const appearanceRequest = useRef(0);
  const appearanceReady = useRef(false);
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  const modelOptions = useMemo(() => getStudioModelOptions(studioGender || null), [studioGender]);
  const currentOptions = useMemo(() => getStudioModelOptions(profile.studioModelGender || null), [profile.studioModelGender]);
  const currentModel = currentOptions.find((option) => option.type === profile.studioModelType);
  const selectedModel = modelOptions.find((option) => option.type === studioModelType);

  useEffect(() => {
    if (!appearanceReady.current) {
      appearanceReady.current = true;
      return;
    }
    if (!profile.studioModelGender || !profile.studioModelType) return;
    const gender = profile.studioModelGender;
    const modelType = profile.studioModelType;
    const requestId = ++appearanceRequest.current;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setAppearanceStatus("saving");
      setError("");
      const saved = await updateAvatarProfile({ skinTonePreset, hairColorPreset });
      if (requestId !== appearanceRequest.current) return;
      if (!saved.ok) {
        setAppearanceStatus("error");
        setError(safeUserMessage(saved.error, "We couldn’t save your appearance. Please try again."));
        return;
      }
      onSavedRef.current(saved.data.profile);
      setAppearanceStatus("generating");
      const generated = await generateAppearancePreview({
        gender,
        modelType,
        skinTone: skinTonePreset,
        hairColor: hairColorPreset
      }, controller.signal);
      if (requestId !== appearanceRequest.current) return;
      if (!generated.ok) {
        setAppearanceStatus("error");
        setError(safeUserMessage(generated.error, "Your appearance was saved, but the preview couldn’t be refreshed. Your last preview is still available."));
        return;
      }
      const image = new window.Image();
      image.onload = () => {
        if (requestId !== appearanceRequest.current) return;
        setPreviewUrl(generated.data.previewUrl);
        setAppearanceStatus("saved");
        onSavedRef.current(generated.data.profile);
      };
      image.onerror = () => requestId === appearanceRequest.current && setAppearanceStatus("error");
      image.src = generated.data.previewUrl;
    }, 650);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [hairColorPreset, skinTonePreset, profile.studioModelGender, profile.studioModelType]);

  function chooseGender(value: StudioModelGender) {
    setStudioGender(value);
    setStudioModelType("");
    setNotice("");
    setError("");
  }

  async function saveStudioModel() {
    if (!studioGender || !studioModelType) {
      setError("Choose your My Model to continue.");
      return;
    }

    setSaving(true);
    setNotice("");
    setError("");

    const result = await updateAvatarProfile({
      tryOnModelSource: "studio",
      studioModelGender: studioGender,
      studioModelType,
      skinTonePreset,
      hairColorPreset
    });

    setSaving(false);
    if (!result.ok) {
      setError(safeUserMessage(result.error, "We couldn’t save your changes. Please try again."));
      return;
    }

    onSaved(result.data.profile);
    setPreviewUrl("");
    setSelectorOpen(false);
    setNotice("Your My Model is ready.");
  }

  return (
    <Card className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-cocoa">
            <Camera size={14} aria-hidden="true" />
            My Model
          </p>
          <h2 className="font-editorial mt-2 text-4xl font-semibold leading-none text-ink">Current FitPick Studio Model</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Your Studio Model is used throughout MyFitPick for Virtual Try-On, Create a Look, Match an Outfit, and styling previews.
          </p>
        </div>
      </div>

      {error ? <p className="rounded-2xl border border-danger/25 bg-danger/10 px-3 py-2 text-xs font-semibold text-ink">{error}</p> : null}
      {notice ? <p className="rounded-2xl border border-success/25 bg-success/10 px-3 py-2 text-xs font-semibold text-ink">{notice}</p> : null}

      <section className="grid gap-4 rounded-xl3 border border-line bg-gradient-to-br from-canvas/80 via-canvas/60 to-olive/10 p-4 md:grid-cols-[0.9fr_1.1fr] md:items-start">
        <div className="sticky top-4 overflow-hidden rounded-2xl border border-line bg-surface/80">
          {currentModel ? (
            <div className="relative aspect-[3/4]">
              <Image
                key={previewUrl || currentModel.imagePath}
                src={previewUrl || currentModel.imagePath}
                alt={`${currentModel.label} FitPick Studio Model with selected appearance`}
                fill
                sizes="(max-width: 768px) 100vw, 320px"
                className="animate-in fade-in h-full w-full object-cover object-top duration-300"
              />
              {appearanceStatus === "saving" || appearanceStatus === "generating" ? (
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-ink/55 via-transparent to-transparent p-3" aria-live="polite">
                  <span className="rounded-full bg-surface/95 px-3 py-1.5 text-xs font-semibold text-ink">{appearanceStatus === "saving" ? "Saving appearance…" : "Updating preview…"}</span>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex aspect-[3/4] items-center justify-center px-6 text-center">
              <div>
                <CheckCircle2 className="mx-auto text-olive" size={34} aria-hidden="true" />
                <p className="mt-3 text-sm font-semibold text-ink">Choose your My Model</p>
                <p className="mt-1 text-xs leading-5 text-muted">Select a FitPick Studio Model to begin.</p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-ink">{currentModel?.label || modelLabel(profile.studioModelGender, profile.studioModelType)}</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              {currentModel?.description || "Choose the Studio Model closest to how you want your styling previews to appear."}
            </p>
          </div>

          <div className="grid gap-5 rounded-2xl border border-line bg-surface/75 p-3">
            <AppearancePresetPicker label="Skin tone" value={skinTonePreset} presets={skinTonePresets} onChange={setSkinTonePreset} />
            <AppearancePresetPicker label="Hair color" value={hairColorPreset} presets={hairColorPresets} onChange={setHairColorPreset} />
            <p className="text-xs leading-5 text-muted" aria-live="polite">
              {appearanceStatus === "saved" ? "Appearance saved." : appearanceStatus === "error" ? "The last good preview is shown." : "Changes save automatically and update your generated previews."}
            </p>
          </div>

          <Button type="button" className="w-full rounded-full" onClick={() => setSelectorOpen((open) => !open)}>
            Change Model
          </Button>
        </div>
      </section>

      {selectorOpen ? (
        <section className="space-y-4 rounded-xl3 border border-cocoa/20 bg-cocoa/5 p-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-cocoa">Choose a model type</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {(["male", "female"] as const).map((gender) => (
                <button
                  key={gender}
                  type="button"
                  onClick={() => chooseGender(gender)}
                  className={cn(
                    "focus-ring min-h-12 rounded-2xl border px-4 text-sm font-bold capitalize transition duration-200 active:scale-[0.98]",
                    studioGender === gender ? "border-cocoa bg-cocoa text-canvas shadow-glow" : "border-line bg-canvas/70 text-ink hover:border-cocoa/50"
                  )}
                  aria-pressed={studioGender === gender}
                >
                  {gender === "male" ? "Male" : "Female"}
                </button>
              ))}
            </div>
          </div>

          {studioGender ? (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-muted">Body shape</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {modelOptions.map((option) => {
                  const selected = studioModelType === option.type;
                  return (
                    <button
                      key={option.type}
                      type="button"
                      onClick={() => setStudioModelType(option.type)}
                      className={cn(
                        "focus-ring group overflow-hidden rounded-[1.5rem] border bg-surface text-left shadow-soft transition duration-200 active:scale-[0.99]",
                        selected ? "border-cocoa shadow-glow ring-2 ring-cocoa/20" : "border-line hover:-translate-y-0.5 hover:border-cocoa/40 hover:shadow-card"
                      )}
                      aria-pressed={selected}
                    >
                      <div className="aspect-[3/4] overflow-hidden bg-canvas">
                        <Image
                          src={option.imagePath}
                          alt={`${option.label} FitPick Studio Model`}
                          width={960}
                          height={1280}
                          className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-[1.02]"
                        />
                      </div>
                      <div className="p-4">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-sm font-bold text-ink">{option.label}</h3>
                          {selected ? <span className="rounded-full bg-cocoa px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-canvas">Selected</span> : null}
                        </div>
                        <p className="mt-2 text-xs leading-5 text-muted">{option.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {selectedModel ? (
            <p className="rounded-2xl border border-line bg-surface/80 px-3 py-2 text-xs leading-5 text-muted">
              Selected: {selectedModel.label}
            </p>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="button" disabled={saving || !studioGender || !studioModelType} onClick={() => void saveStudioModel()}>
              {saving ? "Saving..." : "Save Model"}
            </Button>
            <Button type="button" variant="secondary" disabled={saving} onClick={() => setSelectorOpen(false)}>
              Close
            </Button>
          </div>
        </section>
      ) : null}
    </Card>
  );
}
