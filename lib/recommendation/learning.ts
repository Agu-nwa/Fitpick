export type OutfitFeedbackInput = {
  liked: boolean;
  reason?: string;
  outfitItems: any[];
  preferences?: any;
};

export function calculatePreferenceBoost(
  item: any,
  preferences: any
): number {
  if (!preferences) return 0;

  let boost = 0;

  // Favorite colors

  if (
    preferences.favoriteColors?.includes(
      item.color
    )
  ) {
    boost += 15;
  }

  // Favorite categories

  if (
    preferences.favoriteCategories?.includes(
      item.category
    )
  ) {
    boost += 10;
  }

  return boost;
}

export function learnFromFeedback(
  input: OutfitFeedbackInput
) {
  if (!input.preferences) {
    return input.preferences;
  }

  const preferences = {
    ...input.preferences
  };

  preferences.favoriteColors =
    preferences.favoriteColors || [];

  preferences.favoriteCategories =
    preferences.favoriteCategories || [];

  if (input.liked) {
    input.outfitItems.forEach((item) => {
      if (
        item.color &&
        !preferences.favoriteColors.includes(
          item.color
        )
      ) {
        preferences.favoriteColors.push(
          item.color
        );
      }

      if (
        item.category &&
        !preferences.favoriteCategories.includes(
          item.category
        )
      ) {
        preferences.favoriteCategories.push(
          item.category
        );
      }
    });
  }

  return preferences;
}