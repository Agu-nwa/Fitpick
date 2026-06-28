import type { Occasion } from "@/types/occasion";
import type { OutfitRecommendation, WornLook } from "@/types/outfit";
import type { WardrobeItem } from "@/types/wardrobe";
import type { PlusFeature, StylePreference } from "@/types/user";

export const occasions: Occasion[] = [
  { id: "work", name: "Work", group: "everyday", formality: "polished", description: "Polished, comfortable, not distracting.", icon: "⌁" },
  { id: "school", name: "School", group: "everyday", formality: "balanced", description: "Neat, easy to move in, practical.", icon: "◌" },
  { id: "church", name: "Church", group: "cultural", formality: "polished", description: "Respectful, neat, and composed.", icon: "✦" },
  { id: "wedding", name: "Wedding", group: "cultural", formality: "formal", description: "Elegant, celebratory, photo-ready.", icon: "✧" },
  { id: "owambe", name: "Owambe", group: "cultural", formality: "formal", description: "Festive, expressive, culturally aware.", icon: "◆" },
  { id: "traditional", name: "Traditional event", group: "cultural", formality: "formal", description: "Cultural, respectful, event-appropriate.", icon: "◈" },
  { id: "interview", name: "Interview", group: "formal", formality: "formal", description: "Clean, confident, and credible.", icon: "▣" },
  { id: "date", name: "Date/social outing", group: "social", formality: "balanced", description: "Attractive, comfortable, personality-led.", icon: "♡" },
  { id: "casual", name: "Casual hangout", group: "social", formality: "relaxed", description: "Relaxed, easy, and expressive.", icon: "○" },
  { id: "travel", name: "Travel", group: "everyday", formality: "relaxed", description: "Comfortable, layered, and practical.", icon: "↗" },
  { id: "rainy", name: "Rainy day", group: "weather", formality: "balanced", description: "Weather-safe and practical.", icon: "☂" },
  { id: "hot", name: "Hot day", group: "weather", formality: "relaxed", description: "Light, breathable, low-layer.", icon: "☼" },
  { id: "native-friday", name: "Native Friday", group: "cultural", formality: "polished", description: "Work-appropriate traditional styling.", icon: "◇" },
  { id: "business", name: "Business meeting", group: "formal", formality: "formal", description: "Polished, credible, and minimal.", icon: "▰" }
];

export const wardrobeItems: WardrobeItem[] = [
  { id: "white-shirt", name: "White cotton shirt", category: "tops", color: "White", pattern: "Plain", formality: ["business", "formal"], occasions: ["work", "interview", "business"], weather: ["hot", "indoor"], condition: "ready", lastWorn: "12 days ago", imageTone: "from-stone-50 to-stone-200" },
  { id: "navy-trousers", name: "Navy tailored trousers", category: "bottoms", color: "Navy", pattern: "Plain", formality: ["smart casual", "business"], occasions: ["work", "church", "business"], weather: ["hot", "dry"], condition: "ready", lastWorn: "9 days ago", imageTone: "from-slate-700 to-slate-950" },
  { id: "black-loafers", name: "Black loafers", category: "shoes", color: "Black", formality: ["smart casual", "business"], occasions: ["work", "church", "date"], weather: ["dry"], condition: "ready", lastWorn: "7 days ago", imageTone: "from-neutral-700 to-black" },
  { id: "simple-watch", name: "Simple leather watch", category: "accessories", color: "Brown", formality: ["balanced", "polished"], occasions: ["work", "business", "date"], weather: ["all"], condition: "ready", imageTone: "from-amber-700 to-stone-950" },
  { id: "ankara-top", name: "Ankara native top", category: "native", color: "Multicolor", pattern: "Ankara", formality: ["traditional", "polished"], occasions: ["native-friday", "traditional", "owambe"], weather: ["hot", "dry"], condition: "ready", lastWorn: "18 days ago", imageTone: "from-orange-500 to-indigo-800" },
  { id: "senator-trousers", name: "Cream senator trousers", category: "native", color: "Cream", pattern: "Plain", formality: ["traditional", "polished"], occasions: ["native-friday", "church", "traditional"], weather: ["hot", "dry"], condition: "needs-care", lastWorn: "Last month", imageTone: "from-stone-100 to-amber-100" },
  { id: "white-sneakers", name: "White sneakers", category: "shoes", color: "White", formality: ["casual"], occasions: ["school", "casual", "travel"], weather: ["dry"], condition: "missing-tags", lastWorn: "3 days ago", imageTone: "from-white to-zinc-200" },
  { id: "linen-shirt", name: "Olive linen shirt", category: "tops", color: "Olive", pattern: "Plain", formality: ["balanced", "smart casual"], occasions: ["hot", "travel", "casual"], weather: ["hot", "humid"], condition: "ready", imageTone: "from-olive to-stone-300" },
  { id: "rain-jacket", name: "Charcoal rain jacket", category: "outerwear", color: "Charcoal", pattern: "Plain", formality: ["casual", "travel"], occasions: ["rainy", "travel"], weather: ["rainy", "windy"], condition: "ready", lastWorn: "Never", imageTone: "from-zinc-500 to-zinc-900" },
  { id: "brown-tote", name: "Brown leather tote", category: "bags", color: "Brown", pattern: "Plain", formality: ["balanced", "business"], occasions: ["work", "travel", "business"], weather: ["all"], condition: "ready", lastWorn: "4 days ago", imageTone: "from-yellow-900 to-stone-950" }
];

export const reasonChips = [
  "Occasion-ready",
  "Color-balanced",
  "Weather-aware",
  "Not worn recently",
  "Comfort-first",
  "Polished finish",
  "Event-aware"
];

export const outfitRecommendations: OutfitRecommendation[] = [
  {
    id: "work-polished-01",
    title: "Clean work look",
    occasion: "Work",
    confidence: "Strong match",
    items: wardrobeItems.slice(0, 4),
    reasonChips: ["Occasion-ready", "Color-balanced", "Weather-aware", "Not worn recently"],
    summary: "White shirt, navy trousers, black loafers, and a simple watch.",
    weatherFit: "Light enough for a hot day. Add a blazer if the room is cold.",
    colorNote: "White, navy, and black keep the outfit clean and easy to pair.",
    repeatNote: "You last wore a similar look 12 days ago.",
    careNote: "Iron the shirt for a sharper finish."
  },
  {
    id: "native-friday-01",
    title: "Native Friday polish",
    occasion: "Native Friday",
    confidence: "Good match",
    items: [wardrobeItems[4], wardrobeItems[5], wardrobeItems[2], wardrobeItems[3]],
    reasonChips: ["Event-aware", "Polished finish", "Weather-aware"],
    summary: "Ankara native top, cream senator trousers, loafers, and a simple watch.",
    weatherFit: "Breathable enough for heat, polished enough for office movement.",
    colorNote: "The cream base softens the Ankara pattern.",
    repeatNote: "This combination has not been worn recently.",
    careNote: "Trousers are marked as needs care. Confirm before wearing."
  },
  {
    id: "rainy-travel-01",
    title: "Rain-ready travel look",
    occasion: "Rainy day",
    confidence: "Good match",
    items: [wardrobeItems[7], wardrobeItems[1], wardrobeItems[8], wardrobeItems[9]],
    reasonChips: ["Weather-aware", "Comfort-first", "Color-balanced"],
    summary: "Olive linen shirt, navy trousers, rain jacket, and brown tote.",
    weatherFit: "Closed layers and darker pieces make this safer for light rain.",
    colorNote: "Olive, navy, charcoal, and brown keep the palette grounded.",
    repeatNote: "The rain jacket has not been worn yet.",
    careNote: "Check shoes before leaving if the ground is wet."
  }
];

export const savedLooks = [outfitRecommendations[0], outfitRecommendations[1]];

export const wornLooks: WornLook[] = [
  { ...outfitRecommendations[1], wornOn: "Friday" },
  { ...outfitRecommendations[0], wornOn: "12 days ago" }
];

export const stylePreferences: StylePreference[] = [
  { id: "style", label: "Style", value: "Clean and polished" },
  { id: "formality", label: "Formality", value: "Balanced" },
  { id: "colors", label: "Colors", value: "Neutrals, navy, earth tones" },
  { id: "native", label: "Native wear", value: "Sometimes" }
];

export const plusFeatures: PlusFeature[] = [
  { id: "unlimited", title: "Unlimited outfit picks", description: "Create more outfit options for the same occasion." },
  { id: "memory", title: "Advanced outfit memory", description: "Track combinations and avoid repeats smarter." },
  { id: "events", title: "Event planning", description: "Plan wedding, interview, church, and travel looks early." },
  { id: "travel", title: "Travel packing", description: "Pack by outfit for each day of your trip." },
  { id: "tagging", title: "Priority wardrobe tagging", description: "Get stronger tag suggestions for new wardrobe items." }
];

export const uploadPreviewItems = [
  { id: "preview-shirt", name: "Shirt photo", status: "Ready for tags", imageTone: "from-stone-100 to-stone-300" },
  { id: "preview-shoes", name: "Shoe photo", status: "Needs review", imageTone: "from-neutral-600 to-black" },
  { id: "preview-native", name: "Native top", status: "AI tags suggested", imageTone: "from-orange-400 to-purple-800" }
];

export const emptyStates = {
  wardrobe: { title: "Your wardrobe is empty.", body: "Add your first clothing item.", cta: "Add clothes" },
  shoes: { title: "No shoes added", body: "Shoes help FitPick finish your look and match the occasion.", cta: "Add shoes" },
  looks: { title: "No saved looks yet", body: "Save outfits you like so you can wear them again later.", cta: "Pick outfit" }
};

export const errorStates = {
  upload: { title: "Upload failed", body: "We could not upload this photo. Check your connection and try again.", cta: "Try again" },
  unclear: { title: "Image unclear", body: "This photo is hard to read. Try a clearer photo with one item in view.", cta: "Retake photo" },
  tags: { title: "Tags need review", body: "We suggested what we could. Review the missing fields before saving.", cta: "Review tags" }
};

export const notificationPatterns = [
  { id: "morning", title: "Ready to pick today's outfit?", body: "Choose an occasion and get a look from your wardrobe." },
  { id: "rain", title: "Rain is likely today", body: "Build a weather-safe outfit before you leave." },
  { id: "event", title: "Plan your wedding look early", body: "Save the outfit now and adjust it closer to the day." }
];

export const stateSamples = {
  loading: { title: "Building your outfit", body: "Checking occasion, weather, colors, and worn history." },
  offline: { title: "You are offline", body: "Saved wardrobe items still show. New outfit picks may wait until connection returns.", cta: "Try again" },
  permission: { title: "Weather tips are off", body: "You can still get outfit picks. Weather access only helps FitPick avoid pieces that feel too hot, cold, or rainy." },
  notEnoughItems: { title: "Not enough items", body: "We need at least one top, one bottom, and one pair of shoes for this outfit.", cta: "Add items" },
  premiumLocked: { title: "Advanced swaps are a Plus feature", body: "Unlock deeper swap options by color, formality, travel, and event planning." }
};
