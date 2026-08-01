import { cn } from "@/lib/utils";

type Preset = { value: string; label: string; swatch: string };

export function AppearancePresetPicker<T extends string>({
  label,
  value,
  presets,
  onChange
}: {
  label: string;
  value: T;
  presets: ReadonlyArray<Preset>;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-muted">{label}</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {presets.map((preset) => {
          const selected = value === preset.value;
          return (
            <button
              key={preset.value}
              type="button"
              onClick={() => onChange(preset.value as T)}
              className={cn(
                "focus-ring flex min-h-12 items-center gap-2 rounded-2xl border px-3 py-2 text-left text-xs font-semibold transition",
                selected ? "border-cocoa bg-cocoa/10 text-ink ring-2 ring-cocoa/15" : "border-line bg-canvas/70 text-ink hover:border-cocoa/50"
              )}
              aria-pressed={selected}
            >
              <span className="h-7 w-7 shrink-0 rounded-full border border-black/10 shadow-inner" style={{ background: preset.swatch }} aria-hidden="true" />
              <span>{preset.label}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
