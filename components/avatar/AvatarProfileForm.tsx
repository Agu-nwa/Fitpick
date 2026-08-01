"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Camera, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AppearancePresetPicker } from "@/components/avatar/AppearancePresetPicker";
import { updateAvatarProfile, type AvatarProfileData } from "@/lib/api-client";
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

  const modelOptions = useMemo(() => getStudioModelOptions(studioGender || null), [studioGender]);
  const currentOptions = useMemo(() => getStudioModelOptions(profile.studioModelGender || null), [profile.studioModelGender]);
  const currentModel = currentOptions.find((option) => option.type === profile.studioModelType);
  const selectedModel = modelOptions.find((option) => option.type === studioModelType);

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

      <section className="grid gap-4 rounded-xl3 border border-line bg-gradient-to-br from-canvas/80 via-canvas/60 to-olive/10 p-4 md:grid-cols-[0.9fr_1.1fr] md:items-center">
        <div className="overflow-hidden rounded-2xl border border-line bg-surface/80">
          {currentModel ? (
            <Image
              src={currentModel.imagePath}
              alt={`${currentModel.label} FitPick Studio Model`}
              width={960}
              height={1280}
              className="aspect-[3/4] h-full w-full object-cover object-top"
            />
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
              <div className="mb-5 grid gap-5">
                <AppearancePresetPicker label="Skin tone" value={skinTonePreset} presets={skinTonePresets} onChange={setSkinTonePreset} />
                <AppearancePresetPicker label="Hair color" value={hairColorPreset} presets={hairColorPresets} onChange={setHairColorPreset} />
                <p className="text-xs leading-5 text-muted">These appearance preferences are applied to generated previews. The Studio Model thumbnail represents body shape and pose.</p>
              </div>
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
