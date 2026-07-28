import { resolveOccasionProfile } from "@/lib/recommendation/occasion-profiles";
import { selectOutfitTemplate, templateCategories } from "@/lib/recommendation/outfit-templates";
import { inferOccasionGroup } from "@/lib/recommendation/outfit-structures";

export function resolveOutfitArchitecture(input: {
  occasionName?: string;
  occasionGroup?: string;
  weatherContext?: string;
  recommendationMode?: string;
  styleProfile?: any;
}) {
  const occasionGroup = inferOccasionGroup({
    name: input.occasionName,
    group: input.occasionGroup,
    weatherContext: input.weatherContext
  });
  const occasionProfile = resolveOccasionProfile({
    occasionName: input.occasionName,
    occasionGroup,
    weatherContext: input.weatherContext,
    recommendationMode: input.recommendationMode
  });
  const outfitTemplate = selectOutfitTemplate({
    occasionName: input.occasionName,
    occasionGroup,
    recommendationMode: input.recommendationMode,
    styleProfile: input.styleProfile,
    profile: occasionProfile
  });

  return {
    occasionGroup,
    occasionProfile,
    outfitTemplate,
    desiredStructure: templateCategories(outfitTemplate)
  };
}
