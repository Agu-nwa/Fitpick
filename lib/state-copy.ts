export const emptyStates = {
  wardrobe: {
    title: "Your wardrobe starts here.",
    body: "Add a few pieces you wear often. MyFitPick will begin learning what works together.",
    cta: "Add your first item"
  },
  shoes: {
    title: "No shoes added",
    body: "Shoes help MyFitPick finish your look and match the occasion.",
    cta: "Add shoes"
  }
};

export const errorStates = {
  upload: {
    title: "Upload failed",
    body: "We could not upload this photo. Check your connection and try again.",
    cta: "Try again"
  },
  unclear: {
    title: "Image unclear",
    body: "This photo is hard to read. Try a clearer photo with one item in view.",
    cta: "Retake photo"
  },
  tags: {
    title: "Tags need review",
    body: "We suggested what we could. Review the missing fields before saving.",
    cta: "Review tags"
  }
};

export const stateSamples = {
  loading: { title: "Building your outfit", body: "Checking occasion, weather, colors, and worn history." },
  offline: { title: "You are offline", body: "Saved wardrobe items still show. New outfit picks may wait until connection returns.", cta: "Try again" },
  permission: { title: "Weather tips are off", body: "You can still get outfit picks. Weather access only helps MyFitPick avoid pieces that feel too hot, cold, or rainy." },
  notEnoughItems: { title: "Not enough items", body: "We need at least one top, one bottom, and one pair of shoes for this outfit.", cta: "Add items" },
  premiumLocked: { title: "Credits needed", body: "Credits power premium actions. Basic outfit recommendations stay free." }
};
