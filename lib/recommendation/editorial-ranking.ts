import { outfitSimilarity } from "@/lib/recommendation/diversity";
import { scoreItemForOccasionProfile, type OccasionProfile } from "@/lib/recommendation/occasion-profiles";
import { scoreItemForTemplate, type OutfitTemplate } from "@/lib/recommendation/outfit-templates";
import { scoreStyleDna } from "@/lib/recommendation/style-dna";

type Candidate = {
  items: any[];
  score: number;
  scoreBreakdown?: any;
  similarityMetadata?: any;
};

function editorialBonus(input: {
  candidate: Candidate;
  template?: OutfitTemplate;
  profile?: OccasionProfile;
  styleProfile?: any;
  selected?: Candidate[];
}) {
  const templateScore = input.candidate.items.reduce((sum, item) => sum + scoreItemForTemplate(item, input.template), 0);
  const profileScore = input.profile
    ? input.candidate.items.reduce((sum, item) => sum + scoreItemForOccasionProfile(item, input.profile!), 0)
    : 0;
  const styleDnaScore = scoreStyleDna(input.candidate.items, input.styleProfile);
  const maxSimilarity = input.selected?.length
    ? Math.max(...input.selected.map((chosen) => outfitSimilarity(input.candidate.items, chosen.items)))
    : 0;

  return Math.round((templateScore + profileScore + styleDnaScore - maxSimilarity * 18) * 10) / 10;
}

export function rankCandidatesForEditorialReview<T extends Candidate>(
  candidates: T[],
  input: {
    template?: OutfitTemplate;
    profile?: OccasionProfile;
    styleProfile?: any;
    limit?: number;
  } = {}
) {
  const limit = Math.max(1, Math.min(input.limit || candidates.length || 1, 12));
  const selected: T[] = [];
  const remaining = candidates.map((candidate) => ({ ...candidate }));

  while (selected.length < limit && remaining.length) {
    let bestIndex = 0;
    let bestScore = Number.NEGATIVE_INFINITY;

    remaining.forEach((candidate, index) => {
      const bonus = editorialBonus({
        candidate,
        template: input.template,
        profile: input.profile,
        styleProfile: input.styleProfile,
        selected
      });
      const rankScore = candidate.score + bonus;
      if (rankScore > bestScore) {
        bestScore = rankScore;
        bestIndex = index;
      }
    });

    const [chosen] = remaining.splice(bestIndex, 1);
    selected.push({
      ...chosen,
      score: Math.round(bestScore * 10) / 10,
      scoreBreakdown: {
        ...(chosen.scoreBreakdown || {}),
        editorialReview: {
          mode: "deterministic_openai_ready",
          templateId: input.template?.id || "",
          occasionProfileId: input.profile?.id || "",
          score: Math.round(bestScore * 10) / 10
        }
      },
      similarityMetadata: {
        ...(chosen.similarityMetadata || {}),
        editorialReview: {
          mode: "deterministic_openai_ready",
          templateId: input.template?.id || "",
          occasionProfileId: input.profile?.id || ""
        }
      }
    });
  }

  return selected;
}
