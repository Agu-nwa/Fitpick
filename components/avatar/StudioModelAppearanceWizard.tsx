"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { getStudioModelOptions } from "@/lib/avatar/studio-models";
import {
  STUDIO_MODEL_APPEARANCE_VERSION,
  appearanceLabels,
  isBodyTypeAvailableForGender,
  studioModelBodyTypes,
  studioModelHairColors,
  studioModelHairLengths,
  studioModelHairStyles,
  studioModelHairTextures,
  studioModelHeightBands,
  studioModelSkinTones,
  studioModelUndertones,
  type StudioModelAppearance
} from "@/lib/studio-model/appearance-taxonomy";

type Step = "gender" | "body" | "skin" | "hair" | "height" | "confirm";
const steps: Step[] = ["gender", "body", "skin", "hair", "height", "confirm"];

export const defaultStudioModelAppearance: StudioModelAppearance = {
  version: STUDIO_MODEL_APPEARANCE_VERSION,
  representation: "studio_model",
  gender: "female",
  bodyType: "standard",
  skinTone: "tone_05",
  undertone: "neutral",
  hairTexture: "curly",
  hairLength: "medium",
  hairColor: "black",
  hairStyle: "curly",
  heightBand: "average"
};

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function OptionButton({ selected, children, onClick, style }: { selected: boolean; children: React.ReactNode; onClick: () => void; style?: React.CSSProperties }) {
  return <button type="button" onClick={onClick} style={style} aria-pressed={selected} className={cn("focus-ring min-h-11 rounded-2xl border px-3 py-2 text-sm font-semibold transition", selected ? "border-cocoa bg-cocoa text-canvas shadow-glow" : "border-line bg-canvas/70 text-ink hover:border-cocoa/50")}>{children}</button>;
}

export function StudioModelAppearanceWizard({ initial, saving = false, confirmLabel = "Save My Model", onConfirm, onCancel }: { initial?: StudioModelAppearance | null; saving?: boolean; confirmLabel?: string; onConfirm: (value: StudioModelAppearance) => void | Promise<void>; onCancel?: () => void }) {
  const [step, setStep] = useState<Step>("gender");
  const [value, setValue] = useState<StudioModelAppearance>(initial || defaultStudioModelAppearance);
  const stepIndex = steps.indexOf(step);
  const legacyType = value.bodyType === "plus_size" ? "plus-size" : value.bodyType;
  const preview = useMemo(() => getStudioModelOptions(value.gender).find((item) => item.type === legacyType), [legacyType, value.gender]);
  const bodyTypes = studioModelBodyTypes.filter((item) => isBodyTypeAvailableForGender(value.gender, item));

  function update<K extends keyof StudioModelAppearance>(key: K, next: StudioModelAppearance[K]) {
    setValue((current) => ({ ...current, [key]: next }));
  }
  function chooseGender(gender: StudioModelAppearance["gender"]) {
    setValue((current) => ({ ...current, gender, bodyType: isBodyTypeAvailableForGender(gender, current.bodyType) ? current.bodyType : "standard" }));
  }
  function chooseTexture(hairTexture: StudioModelAppearance["hairTexture"]) {
    if (hairTexture === "bald") setValue((current) => ({ ...current, hairTexture, hairStyle: "bald", hairLength: "shaved" }));
    else setValue((current) => ({ ...current, hairTexture, hairStyle: current.hairStyle === "bald" ? "short_natural" : current.hairStyle, hairLength: current.hairLength === "shaved" ? "short" : current.hairLength }));
  }

  return <div className="space-y-5">
    <div className="flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-[0.15em] text-muted"><span>{label(step)}</span><span>{stepIndex + 1} / {steps.length}</span></div>
    <div className="h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full bg-cocoa transition-all" style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }} /></div>

    {step === "gender" ? <section className="space-y-3"><h3 className="text-lg font-bold text-ink">How should your Studio Model be presented?</h3><div className="grid grid-cols-2 gap-3">{(["female", "male"] as const).map((item) => <OptionButton key={item} selected={value.gender === item} onClick={() => chooseGender(item)}>{label(item)}</OptionButton>)}</div></section> : null}

    {step === "body" ? <section className="space-y-3"><h3 className="text-lg font-bold text-ink">Choose a body type</h3><p className="text-xs leading-5 text-muted">This controls garment proportion and drape. It is not a judgment about your body.</p><div className="grid grid-cols-2 gap-3">{bodyTypes.map((item) => <OptionButton key={item} selected={value.bodyType === item} onClick={() => update("bodyType", item)}>{appearanceLabels.bodyType[item]}</OptionButton>)}</div></section> : null}

    {step === "skin" ? <section className="space-y-4"><div><h3 className="text-lg font-bold text-ink">Choose a skin tone</h3><p className="mt-1 text-xs leading-5 text-muted">A neutral ten-tone scale gives direct appearance control without racial or ethnic labels.</p></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-5">{studioModelSkinTones.map((item, index) => <OptionButton key={item} selected={value.skinTone === item} onClick={() => update("skinTone", item)} style={{ backgroundColor: value.skinTone === item ? undefined : ["#f4d7c3", "#eac2a7", "#dca783", "#cd916c", "#b97952", "#9e6040", "#82482f", "#673421", "#4c2518", "#321710"][index], color: index > 4 && value.skinTone !== item ? "white" : undefined }}>{appearanceLabels.skinTone[index]}</OptionButton>)}</div><div><p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">Undertone (optional)</p><div className="grid grid-cols-3 gap-2">{studioModelUndertones.map((item) => <OptionButton key={item} selected={value.undertone === item} onClick={() => update("undertone", item)}>{label(item)}</OptionButton>)}</div></div></section> : null}

    {step === "hair" ? <section className="space-y-4"><h3 className="text-lg font-bold text-ink">Choose hair</h3>{([["Texture", studioModelHairTextures, "hairTexture"], ["Length", studioModelHairLengths, "hairLength"], ["Style", studioModelHairStyles, "hairStyle"], ["Color", studioModelHairColors, "hairColor"]] as const).map(([title, options, key]) => <div key={key}><p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">{title}</p><div className="flex flex-wrap gap-2">{options.filter((item) => value.hairTexture === "bald" ? item === "bald" || item === "shaved" || key === "hairColor" : item !== "bald").map((item) => <OptionButton key={item} selected={value[key] === item} onClick={() => key === "hairTexture" ? chooseTexture(item as StudioModelAppearance["hairTexture"]) : update(key, item as never)}>{label(item)}</OptionButton>)}</div></div>)}</section> : null}

    {step === "height" ? <section className="space-y-3"><h3 className="text-lg font-bold text-ink">Height presentation (optional)</h3><div className="grid grid-cols-3 gap-3">{studioModelHeightBands.map((item) => <OptionButton key={item} selected={value.heightBand === item} onClick={() => update("heightBand", item)}>{label(item)}</OptionButton>)}</div><button className="text-sm font-semibold text-cocoa underline" type="button" onClick={() => update("heightBand", undefined)}>No preference</button></section> : null}

    {step === "confirm" ? <section className="grid gap-4 md:grid-cols-[0.8fr_1.2fr]"><div className="overflow-hidden rounded-2xl border border-line bg-canvas">{preview ? <Image src={preview.imagePath} alt="Studio Model body preview" width={960} height={1280} className="aspect-[3/4] h-full w-full object-cover object-top" /> : null}</div><div><h3 className="text-lg font-bold text-ink">Confirm your appearance</h3><p className="mt-2 text-xs leading-5 text-muted">The image is the compatible body-model base. Your saved skin and hair selections remain authoritative for generated assets and every future try-on.</p><dl className="mt-4 grid grid-cols-2 gap-2 text-sm">{[["Presentation", value.gender], ["Body", value.bodyType], ["Skin", `${value.skinTone}${value.undertone ? ` / ${value.undertone}` : ""}`], ["Hair", `${value.hairColor} ${value.hairStyle}`], ["Texture", value.hairTexture], ["Height", value.heightBand || "No preference"]].map(([term, description]) => <div key={term}><dt className="text-xs text-muted">{term}</dt><dd className="font-semibold text-ink">{label(description)}</dd></div>)}</dl></div></section> : null}

    <div className="grid gap-2 sm:grid-cols-2">{stepIndex > 0 ? <Button type="button" variant="secondary" disabled={saving} onClick={() => setStep(steps[stepIndex - 1])}>Back</Button> : onCancel ? <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button> : <span />}{step === "confirm" ? <Button type="button" disabled={saving} onClick={() => void onConfirm(value)}>{saving ? "Saving..." : confirmLabel}</Button> : <Button type="button" onClick={() => setStep(steps[stepIndex + 1])}>Continue</Button>}</div>
  </div>;
}
