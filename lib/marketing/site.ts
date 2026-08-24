export type MarketingTone = "dark" | "light" | "cocoa";

export type MarketingSection = {
  eyebrow: string;
  title: string;
  body: string;
  image: string;
  imageAlt: string;
  tone: MarketingTone;
  bullets?: string[];
};

export type MarketingPageConfig = {
  slug: string;
  eyebrow: string;
  title: string;
  description: string;
  heroImage: string;
  heroAlt: string;
  primaryLabel: string;
  primaryHref: string;
  sections: MarketingSection[];
  principles?: Array<{ title: string; body: string }>;
  faqs?: Array<{ question: string; answer: string }>;
};

const digitalClosetImage = "/marketing/myfitpick-digital-closet-diverse-v2.png";
const stylistImage = "/marketing/myfitpick-ai-stylist-editorial-v1.png";
const assemblyImage = "/marketing/myfitpick-outfit-assembly-editorial-v1.png";
const studioImage = "/fashion/editorial-blue-blouse-canonical-v1.png";

export const marketingPages: Record<string, MarketingPageConfig> = {
  home: {
    slug: "home",
    eyebrow: "YOUR WARDROBE · STYLED INTELLIGENTLY",
    title: "Style from the clothes you already own.",
    description: "MyFitPick understands your confirmed wardrobe and creates complete outfits for your day, weather and occasion.",
    heroImage: "/marketing/myfitpick-brand-models-hero-v1.png",
    heroAlt: "MyFitPick's two brand models in coordinated cocoa and ivory tailoring",
    primaryLabel: "Meet Your AI Stylist",
    primaryHref: "/stylist",
    sections: [
      {
        eyebrow: "DIGITAL CLOSET",
        title: "Everything you own, understood.",
        body: "Upload up to 10 items at once. MyFitPick analyzes each piece in the background and prompts you to review it when ready. Only confirmed items enter your wardrobe intelligence.",
        image: digitalClosetImage,
        imageAlt: "A diverse wardrobe of adult, teen and children's clothing",
        tone: "light",
        bullets: ["Multi-item upload", "Background analysis", "Review before recommendations"]
      },
      {
        eyebrow: "AI STYLIST",
        title: "Outfits that know the weather and the occasion.",
        body: "MyFitPick studies your confirmed wardrobe and coordinates colour, fit, formality, weather and occasion to create outfits that make sense for your day.",
        image: stylistImage,
        imageAlt: "A complete outfit composed from coordinated wardrobe pieces",
        tone: "dark",
        bullets: ["Your actual clothes", "Context-aware styling", "Footwear and finishing pieces"]
      },
      {
        eyebrow: "OUTFIT ASSEMBLY",
        title: "Complete looks from the pieces you own.",
        body: "See how individual wardrobe pieces come together as a coordinated outfit—balanced for colour, proportion, formality and your plans.",
        image: assemblyImage,
        imageAlt: "Separate wardrobe pieces becoming a complete outfit",
        tone: "light",
        bullets: ["Clear selections", "Styling rationale", "Optional Virtual Try-On"]
      },
      {
        eyebrow: "STUDIO MODEL",
        title: "See the complete idea.",
        body: "Visualize an assembled outfit on your personal Studio Model. Virtual Try-On is an AI styling preview, not a guarantee of physical fit or tailoring.",
        image: studioImage,
        imageAlt: "A complete outfit visualized on a Studio Model",
        tone: "dark",
        bullets: ["Personal Studio Model", "Consistent outfit pieces", "Clear AI disclosure"]
      }
    ],
    principles: [
      { title: "Your wardrobe remains yours", body: "Wardrobe photos stay connected to your account and unconfirmed items remain outside recommendations." },
      { title: "You control what enters", body: "Review and confirmation determine which item details become wardrobe intelligence." },
      { title: "Feedback shapes future looks", body: "Likes, dislikes and saved looks provide personal preference signals." }
    ],
    faqs: [
      { question: "Do I need to upload my whole wardrobe?", answer: "No. Start with the pieces you want MyFitPick to understand and add more over time." },
      { question: "Do I need front, back and label photos?", answer: "No. One clear main photo is enough to begin. Optional extra photos can help when a visible detail matters, but they are not required." },
      { question: "What happens when analysis is uncertain?", answer: "The item remains reviewable. Confirm the basics manually, retry the AI for that item, or remove it without affecting the rest of the batch." },
      { question: "Does Virtual Try-On start automatically?", answer: "No. You choose whether to start a Virtual Try-On after receiving an outfit recommendation." }
    ]
  },
  "how-it-works": {
    slug: "how-it-works",
    eyebrow: "HOW IT WORKS",
    title: "Your wardrobe becomes something you can ask.",
    description: "Upload the pieces you own, review what MyFitPick finds, then ask for a look in natural language. Styling continues from your confirmed wardrobe.",
    heroImage: digitalClosetImage,
    heroAlt: "A diverse wardrobe of adult, teen and children's clothing arranged on a warm ivory background",
    primaryLabel: "Build Your Closet",
    primaryHref: "/wardrobe/bulk-upload",
    sections: [
      {
        eyebrow: "01 · UPLOAD",
        title: "Add several pieces in one sitting.",
        body: "Upload up to 10 clear item photos at once. Analysis continues in the background, so you can leave the page instead of waiting for every item.",
        image: digitalClosetImage,
        imageAlt: "A coordinated collection of wardrobe pieces for different ages and occasions",
        tone: "light",
        bullets: ["Up to 10 items per batch", "Background analysis", "Plain-background photo guidance"]
      },
      {
        eyebrow: "02 · REVIEW",
        title: "Confirm the details that shape recommendations.",
        body: "MyFitPick prompts you when analysis is ready. Review category, colour, fit and other useful details before the item can influence the Stylist.",
        image: stylistImage,
        imageAlt: "Coordinated wardrobe pieces connected by subtle gold lines",
        tone: "dark",
        bullets: ["Unconfirmed items stay excluded", "Unknown terms require confirmation", "You remain in control"]
      },
      {
        eyebrow: "03 · STYLE",
        title: "Ask for the moment you are dressing for.",
        body: "Describe the occasion, weather and mood. MyFitPick coordinates the confirmed pieces that make sense together.",
        image: assemblyImage,
        imageAlt: "Separate wardrobe pieces becoming a complete coordinated outfit",
        tone: "light",
        bullets: ["Occasion-aware", "Weather-aware", "Colour, proportion and formality"]
      }
    ],
    principles: [
      { title: "Your actual clothes", body: "Recommendations begin with the items you reviewed and saved." },
      { title: "Useful context", body: "Weather, occasion and styling intent guide every result." },
      { title: "Personal feedback", body: "Likes and dislikes help future suggestions better reflect your taste." }
    ]
  },
  features: {
    slug: "features",
    eyebrow: "FEATURES",
    title: "Wardrobe intelligence, without the wardrobe admin.",
    description: "MyFitPick combines background item analysis, user review and context-aware styling in one connected wardrobe experience.",
    heroImage: stylistImage,
    heroAlt: "A complete outfit assembled from coordinated wardrobe pieces",
    primaryLabel: "Meet Your AI Stylist",
    primaryHref: "/stylist",
    sections: [
      {
        eyebrow: "DIGITAL CLOSET",
        title: "Everything you own, understood.",
        body: "Upload multiple garments, shoes, bags and accessories. MyFitPick organizes confirmed pieces into a wardrobe the Stylist can use.",
        image: digitalClosetImage,
        imageAlt: "A diverse digital closet composition",
        tone: "light",
        bullets: ["Multi-item upload", "Background AI analysis", "Review before styling"]
      },
      {
        eyebrow: "AI STYLIST",
        title: "Outfits that know the weather and the occasion.",
        body: "The Stylist coordinates colour, fit, formality, weather and occasion using your confirmed wardrobe.",
        image: stylistImage,
        imageAlt: "A complete smart-casual outfit coordinated by MyFitPick",
        tone: "dark",
        bullets: ["Natural-language requests", "Footwear and accessories", "Styling explanations"]
      },
      {
        eyebrow: "OUTFIT ASSEMBLY",
        title: "See how every piece earns its place.",
        body: "Review the individual items selected for a look and the reasoning that connects them before choosing whether to preview it.",
        image: assemblyImage,
        imageAlt: "Garments assembled into one finished outfit",
        tone: "light",
        bullets: ["Complete looks", "Clear item selection", "Optional Virtual Try-On"]
      }
    ],
    faqs: [
      { question: "Does MyFitPick remove photo backgrounds?", answer: "No. Use a plain, contrasting background and good lighting so garment details are easier to analyze." },
      { question: "Can an item style recommendations before review?", answer: "No. Unconfirmed uploads stay outside recommendation and Stylist inputs until you review and save them." },
      { question: "Does feedback improve future recommendations?", answer: "Likes, dislikes and outfit feedback become preference signals used by the recommendation experience." }
    ]
  },
  "ai-stylist": {
    slug: "ai-stylist",
    eyebrow: "AI STYLIST",
    title: "A stylist that starts with your real wardrobe.",
    description: "Ask for a look in your own words. MyFitPick considers the occasion, weather, colour, fit and formality, then works with pieces you have confirmed.",
    heroImage: stylistImage,
    heroAlt: "A complete smart-casual outfit arranged in a dark editorial studio",
    primaryLabel: "Meet Your AI Stylist",
    primaryHref: "/stylist",
    sections: [
      {
        eyebrow: "ASK NATURALLY",
        title: "Describe the day, not a dress code form.",
        body: "Tell MyFitPick where you are going, what the weather feels like and how you want to look. Type, speak or add an inspiration item.",
        image: stylistImage,
        imageAlt: "Wardrobe pieces arranged as a complete outfit",
        tone: "dark",
        bullets: ["Occasion and mood", "Weather context", "Optional inspiration item"]
      },
      {
        eyebrow: "YOUR WARDROBE",
        title: "Selections grounded in pieces you reviewed.",
        body: "The Stylist sees confirmed wardrobe metadata—including category, colour, pattern, fit, material and styling roles—when that information is available.",
        image: digitalClosetImage,
        imageAlt: "A diverse selection of confirmed wardrobe pieces",
        tone: "light",
        bullets: ["Confirmed items only", "Useful garment intelligence", "Unknown details stay reviewable"]
      },
      {
        eyebrow: "FEEDBACK",
        title: "It becomes more personal with every choice.",
        body: "Save looks, like or dislike recommendations and explain what did not work. Those signals help the experience adapt to your preferences.",
        image: studioImage,
        imageAlt: "An editorial Studio Model preview wearing a coordinated outfit",
        tone: "cocoa",
        bullets: ["Likes and dislikes", "Saved looks", "Preference-aware refinement"]
      }
    ]
  },
  "digital-closet": {
    slug: "digital-closet",
    eyebrow: "DIGITAL CLOSET",
    title: "Everything you own, understood.",
    description: "Build a living inventory of the garments, shoes, bags and accessories you want MyFitPick to style.",
    heroImage: digitalClosetImage,
    heroAlt: "A curated wardrobe containing clothing for adults, teens and children",
    primaryLabel: "Build Your Closet",
    primaryHref: "/wardrobe/bulk-upload",
    sections: [
      {
        eyebrow: "MULTI-ITEM UPLOAD",
        title: "Add up to 10 items, then carry on with your day.",
        body: "Each item is prepared independently. If one image fails, the remaining items continue and the failed item can be retried or reviewed manually.",
        image: digitalClosetImage,
        imageAlt: "A diverse selection of wardrobe items on warm ivory",
        tone: "light",
        bullets: ["Independent item status", "Retry individual failures", "No all-or-nothing batch"]
      },
      {
        eyebrow: "BACKGROUND ANALYSIS",
        title: "Details are extracted while you are elsewhere.",
        body: "MyFitPick analyzes visible garment characteristics in the background and notifies you in the app when items are ready for review.",
        image: stylistImage,
        imageAlt: "Garment details represented as a coordinated editorial composition",
        tone: "dark",
        bullets: ["No waiting on the review screen", "No fabricated progress", "In-app ready state"]
      },
      {
        eyebrow: "REVIEW MATTERS",
        title: "Nothing becomes wardrobe intelligence silently.",
        body: "Review gives recommendations reliable basics and prevents uncertain or unknown taxonomy values from becoming canonical without confirmation.",
        image: assemblyImage,
        imageAlt: "Reviewed garments assembling into one look",
        tone: "light",
        bullets: ["Category and colour required", "Subcategory confirmation", "Recommendation-safe data"]
      }
    ]
  },
  "outfit-assembly": {
    slug: "outfit-assembly",
    eyebrow: "OUTFIT ASSEMBLY",
    title: "Complete looks from the pieces you own.",
    description: "See how individual wardrobe pieces become a coordinated outfit balanced for colour, proportion, formality and your plans.",
    heroImage: assemblyImage,
    heroAlt: "Separate wardrobe pieces becoming a polished complete outfit",
    primaryLabel: "See How It Works",
    primaryHref: "/how-it-works",
    sections: [
      {
        eyebrow: "THE REQUEST",
        title: "Start with where you are going.",
        body: "A dinner after work, a warm-weather wedding or an ordinary weekend each asks something different from the same closet.",
        image: stylistImage,
        imageAlt: "A polished outfit selected for an occasion",
        tone: "dark",
        bullets: ["Occasion", "Weather", "Mood and formality"]
      },
      {
        eyebrow: "THE COMPOSITION",
        title: "Every piece has a reason to be there.",
        body: "MyFitPick considers garment roles, colour relationships, layering, fit and finishing pieces when assembling a recommendation.",
        image: assemblyImage,
        imageAlt: "An outfit assembled from separate coordinated pieces",
        tone: "light",
        bullets: ["Top and bottom balance", "Footwear included", "Accessories when appropriate"]
      },
      {
        eyebrow: "THE PREVIEW",
        title: "See the complete idea on your Studio Model.",
        body: "Virtual Try-On is an optional AI-generated styling preview. It helps visualize the composition but does not guarantee physical fit or tailoring.",
        image: studioImage,
        imageAlt: "A Studio Model preview of a complete outfit",
        tone: "cocoa",
        bullets: ["Optional preview", "Consistent selected pieces", "Clear AI disclosure"]
      }
    ]
  }
};
