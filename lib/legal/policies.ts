export type LegalPolicyId =
  | "privacy"
  | "terms"
  | "cookies"
  | "acceptable-use"
  | "ai-virtual-try-on"
  | "subscription-and-credits"
  | "refund"
  | "copyright-ip";

export type LegalPolicySection = {
  title: string;
  body?: string[];
  bullets?: string[];
};

export type LegalPolicy = {
  id: LegalPolicyId;
  title: string;
  shortTitle: string;
  href: string;
  eyebrow: string;
  summary: string;
  intro: string[];
  sections: LegalPolicySection[];
};

export const legalLastUpdated = "July 23, 2026";
export const legalContactEmail = "support@myfitpick.com";

export const legalPolicies: Record<LegalPolicyId, LegalPolicy> = {
  privacy: {
    id: "privacy",
    title: "Privacy Policy",
    shortTitle: "Privacy",
    href: "/legal/privacy",
    eyebrow: "Privacy",
    summary: "How MyFitPick collects, uses, protects, and lets you control your account and wardrobe information.",
    intro: [
      "MyFitPick helps you organize your wardrobe, receive outfit suggestions, and create fashion previews from the information you choose to provide.",
      "This Privacy Policy explains what we collect, how we use it, and the choices you have."
    ],
    sections: [
      {
        title: "Information you provide",
        bullets: [
          "Account details, such as your email address, display name, and sign-in verification activity.",
          "Wardrobe photos, item details, label photos, fit notes, care notes, and style preferences you add or confirm.",
          "Optional model setup information, such as a full-body photo, avatar preferences, clothing fit details, and shoe size.",
          "Payment and Credits activity, including Credit purchases, Credit usage, refunds, and transaction status.",
          "Messages you send to the Stylist and feedback you give on recommendations."
        ]
      },
      {
        title: "Information created while you use MyFitPick",
        bullets: [
          "Wardrobe metadata, outfit recommendations, saved looks, generated previews, and preference signals.",
          "Approximate dressing location only when you choose to save a city for weather-aware suggestions.",
          "Device and usage information needed to keep the service secure, reliable, and easy to improve."
        ]
      },
      {
        title: "How we use information",
        bullets: [
          "To create and manage your account.",
          "To organize your wardrobe and show outfit suggestions from your own saved items.",
          "To generate previews when you request them.",
          "To personalize recommendations using preferences you provide or confirm.",
          "To manage Credits, purchases, refunds, fraud prevention, and customer support.",
          "To maintain safety, security, service quality, and legal compliance."
        ]
      },
      {
        title: "Sensitive information",
        body: [
          "MyFitPick is designed for fashion context. We do not ask you to provide sensitive identity information, and we do not use wardrobe, avatar, or styling information to infer protected personal traits.",
          "Cultural, event, or occasion styling is treated only as clothing context when you provide it."
        ]
      },
      {
        title: "Sharing",
        body: [
          "We do not sell your wardrobe photos or personal style profile. We may share information with trusted service partners that help us provide account access, payments, storage, support, analytics, safety, and AI-powered features.",
          "These partners may process information only as needed to provide services to MyFitPick and are expected to protect it appropriately."
        ]
      },
      {
        title: "Your choices",
        bullets: [
          "You can edit wardrobe details, Style DNA, avatar settings, and profile preferences.",
          "You can remove wardrobe items and update saved preferences.",
          "You can request help with account access, privacy questions, or account deletion by contacting us."
        ]
      },
      {
        title: "Retention",
        body: [
          "We keep information for as long as needed to provide MyFitPick, maintain accurate Credits records, meet legal obligations, resolve disputes, and protect the service.",
          "When information is no longer needed, we delete it or keep it only in a limited form where required for security, accounting, or legal reasons."
        ]
      }
    ]
  },
  terms: {
    id: "terms",
    title: "Terms of Service",
    shortTitle: "Terms",
    href: "/legal/terms",
    eyebrow: "Terms",
    summary: "The rules for using MyFitPick, managing your account, and using fashion recommendations and previews.",
    intro: [
      "These Terms govern your access to and use of MyFitPick.",
      "By creating an account or using the service, you agree to use MyFitPick responsibly and in line with these Terms."
    ],
    sections: [
      {
        title: "Your account",
        bullets: [
          "You are responsible for keeping access to your email account secure.",
          "You must provide accurate information when creating or updating your account.",
          "You may not use another person's account or allow someone else to misuse yours."
        ]
      },
      {
        title: "Using MyFitPick",
        bullets: [
          "MyFitPick helps you manage wardrobe information, receive outfit suggestions, and create previews.",
          "Recommendations and previews are guidance only and may not be exact.",
          "You are responsible for deciding what to wear and whether an outfit is appropriate for your setting."
        ]
      },
      {
        title: "Photos and content you upload",
        bullets: [
          "Only upload photos and content you have the right to use.",
          "Do not upload sensitive documents, private information unrelated to styling, or content that violates another person's rights.",
          "You give MyFitPick permission to use your uploaded content only as needed to provide, protect, and improve the service."
        ]
      },
      {
        title: "Credits and paid features",
        body: [
          "Some features use Credits. The number of Credits required is shown in the app before or during the action.",
          "Credits are charged according to the Credits Policy and only when the requested paid result is completed."
        ]
      },
      {
        title: "Service changes",
        body: [
          "We may update, improve, suspend, or discontinue parts of MyFitPick. We will aim to make changes clearly and avoid unnecessary disruption."
        ]
      },
      {
        title: "No professional advice",
        body: [
          "MyFitPick provides fashion and wardrobe suggestions. It does not provide legal, medical, financial, safety, or professional advice."
        ]
      },
      {
        title: "Limitation of responsibility",
        body: [
          "To the fullest extent permitted by law, MyFitPick is provided on an as-available basis. We are not responsible for indirect, incidental, or consequential losses arising from use of the service."
        ]
      }
    ]
  },
  cookies: {
    id: "cookies",
    title: "Cookie Policy",
    shortTitle: "Cookies",
    href: "/legal/cookie-policy",
    eyebrow: "Cookies",
    summary: "How MyFitPick uses cookies and similar local technologies to keep accounts signed in and improve the product.",
    intro: [
      "Cookies and similar local technologies help MyFitPick remember secure sessions, protect accounts, and make the app easier to use.",
      "This Cookie Policy explains the main categories we use."
    ],
    sections: [
      {
        title: "Essential cookies",
        body: [
          "Essential cookies are needed for sign-in, account security, session continuity, fraud prevention, and basic app functions. The service may not work properly without them."
        ]
      },
      {
        title: "Preference storage",
        body: [
          "MyFitPick may remember choices such as interface preferences, draft upload state, and recently selected options so the app feels consistent when you return."
        ]
      },
      {
        title: "Analytics and improvement",
        body: [
          "We may use privacy-conscious analytics to understand product performance, feature usage, and errors. These tools help us improve MyFitPick without showing your private wardrobe publicly."
        ]
      },
      {
        title: "Managing cookies",
        body: [
          "You can control cookies through your browser settings. Blocking essential cookies may sign you out or prevent parts of MyFitPick from working."
        ]
      }
    ]
  },
  "acceptable-use": {
    id: "acceptable-use",
    title: "Acceptable Use Policy",
    shortTitle: "Acceptable use",
    href: "/legal/acceptable-use",
    eyebrow: "Safety",
    summary: "The standards that keep MyFitPick respectful, lawful, and safe for every user.",
    intro: [
      "MyFitPick should feel useful, respectful, and private.",
      "This Acceptable Use Policy explains what is and is not allowed when using the service."
    ],
    sections: [
      {
        title: "Allowed use",
        bullets: [
          "Organize your wardrobe and personal style preferences.",
          "Ask for outfit ideas, weather-aware styling, and occasion guidance.",
          "Create previews using content you have the right to use.",
          "Save, edit, and manage your own wardrobe information."
        ]
      },
      {
        title: "Do not misuse MyFitPick",
        bullets: [
          "Do not upload content that is illegal, hateful, harassing, exploitative, or sexually explicit.",
          "Do not upload someone else's private photos without permission.",
          "Do not attempt to access another user's account, wardrobe, previews, Credits, or payment records.",
          "Do not use MyFitPick to deceive, impersonate, stalk, shame, or harass another person.",
          "Do not interfere with service security, availability, or normal operation."
        ]
      },
      {
        title: "AI safety",
        body: [
          "Do not attempt to force the Stylist or preview features to reveal private system behavior, another user's information, or restricted content.",
          "MyFitPick may refuse, limit, or remove content that appears unsafe or abusive."
        ]
      },
      {
        title: "Enforcement",
        body: [
          "We may remove content, limit features, pause access, or close accounts that violate this policy or create risk for users, MyFitPick, or the public."
        ]
      }
    ]
  },
  "ai-virtual-try-on": {
    id: "ai-virtual-try-on",
    title: "AI and Virtual Try-On Disclosure",
    shortTitle: "AI disclosure",
    href: "/legal/ai-virtual-try-on-disclosure",
    eyebrow: "AI disclosure",
    summary: "What to expect from AI styling, wardrobe intelligence, and virtual try-on previews.",
    intro: [
      "MyFitPick uses AI-assisted features to help organize clothing, suggest outfits, and create visual previews.",
      "These features are useful styling tools, but they are not perfect measurements or guarantees."
    ],
    sections: [
      {
        title: "Wardrobe intelligence",
        body: [
          "When you upload a wardrobe item, MyFitPick may suggest details such as category, color, pattern, fabric, brand, size, care notes, and occasion fit.",
          "You should review and correct important details before saving an item to your closet."
        ]
      },
      {
        title: "Stylist responses",
        body: [
          "The Stylist uses your saved wardrobe and preferences to suggest outfits. It should not invent owned items, and you remain responsible for deciding whether a suggestion works for the occasion."
        ]
      },
      {
        title: "Virtual Try-On previews",
        bullets: [
          "Previews are fashion visualizations, not perfect fittings.",
          "Color, drape, length, texture, footwear, accessories, and body proportions may appear differently from real life.",
          "A full-body model photo can improve preview quality, but results still may not be exact.",
          "Generated previews should not be used as proof that a garment will fit."
        ]
      },
      {
        title: "Low-confidence results",
        body: [
          "If MyFitPick is uncertain, it may ask you to review or edit information. Unknown details should remain blank or marked for review rather than guessed."
        ]
      },
      {
        title: "User control",
        body: [
          "You can edit saved wardrobe metadata, profile preferences, Style DNA, and model details. You can also choose whether to use paid preview features."
        ]
      }
    ]
  },
  "subscription-and-credits": {
    id: "subscription-and-credits",
    title: "Subscription and Credits Policy",
    shortTitle: "Credits",
    href: "/legal/subscription-and-credits-policy",
    eyebrow: "Credits",
    summary: "How Credits work, what is free, and how paid MyFitPick actions are charged.",
    intro: [
      "MyFitPick is currently a credit-based product.",
      "Some features are free, and certain premium actions use Credits only after successful completion."
    ],
    sections: [
      {
        title: "No active subscription plan",
        body: [
          "MyFitPick does not currently offer a recurring subscription plan. If subscription plans are introduced later, the plan terms, renewal rules, and cancellation rights will be shown before purchase."
        ]
      },
      {
        title: "Credits",
        bullets: [
          "Credits are used for selected premium features, such as AI Stylist requests and Virtual Try-On previews.",
          "Free outfit recommendations, weather-aware styling, and basic wardrobe browsing may be available without spending Credits.",
          "The app will show when Credits are required for an action."
        ]
      },
      {
        title: "Complimentary and purchased Credits",
        body: [
          "Complimentary signup Credits may be provided for new accounts. Complimentary Credits are used before purchased Credits.",
          "Purchased Credits do not expire unless required by law or stated clearly at purchase."
        ]
      },
      {
        title: "When Credits are charged",
        body: [
          "Credits should be deducted only after a paid action completes successfully. If a paid preview cannot be completed, MyFitPick should not keep the Credit charge for that failed result."
        ]
      },
      {
        title: "Credit balance",
        body: [
          "You can view your Credit balance and purchase history in your wallet. Contact support if you believe your balance is incorrect."
        ]
      }
    ]
  },
  refund: {
    id: "refund",
    title: "Refund Policy",
    shortTitle: "Refunds",
    href: "/legal/refund-policy",
    eyebrow: "Refunds",
    summary: "When Credit purchases or paid actions may qualify for review, correction, or refund.",
    intro: [
      "This Refund Policy explains how MyFitPick handles Credit purchase issues and failed paid actions.",
      "Refund decisions may depend on payment status, account records, and applicable law."
    ],
    sections: [
      {
        title: "Failed paid actions",
        body: [
          "If a paid action fails before a completed result is delivered, Credits should not be permanently spent for that failed result.",
          "If a Credit charge appears after a failed paid action, contact support so we can review and correct it."
        ]
      },
      {
        title: "Credit purchases",
        body: [
          "Purchased Credits are generally intended for use inside MyFitPick. Refunds for unused purchased Credits may be reviewed case by case, subject to payment status, fraud prevention, account history, and applicable law."
        ]
      },
      {
        title: "Completed AI results",
        body: [
          "AI results and previews can vary. A completed result that is imperfect may not automatically qualify for a refund, but you can contact support if something went materially wrong."
        ]
      },
      {
        title: "Unauthorized purchases",
        body: [
          "If you believe a purchase was unauthorized, contact support promptly. We may ask for information needed to investigate and protect the account."
        ]
      },
      {
        title: "How to request help",
        body: [
          "Include the email address on your account, the approximate purchase date, the Credit pack, and a short description of the issue. Do not send full card numbers or private financial credentials."
        ]
      }
    ]
  },
  "copyright-ip": {
    id: "copyright-ip",
    title: "Copyright and Intellectual Property Policy",
    shortTitle: "Copyright",
    href: "/legal/copyright-ip-policy",
    eyebrow: "Intellectual property",
    summary: "Rules for uploaded content, ownership, brand references, and rights complaints.",
    intro: [
      "MyFitPick respects intellectual property rights.",
      "This policy explains your responsibilities when uploading content and how rights concerns can be raised."
    ],
    sections: [
      {
        title: "Your content",
        body: [
          "You keep the rights you have in photos, wardrobe information, and other content you upload.",
          "You give MyFitPick permission to use that content as needed to provide, protect, and improve the service."
        ]
      },
      {
        title: "Only upload content you can use",
        bullets: [
          "Do not upload photos, designs, logos, artwork, or other content if you do not have the right to use them.",
          "Do not use MyFitPick to copy, sell, or misrepresent another person's or brand's work.",
          "Brand names, logos, or garment references may appear as descriptive wardrobe information only."
        ]
      },
      {
        title: "MyFitPick content",
        body: [
          "The MyFitPick name, interface, product copy, design system, software, and service content are owned by MyFitPick or its licensors. You may not copy or misuse them except as allowed by law or written permission."
        ]
      },
      {
        title: "Rights complaints",
        body: [
          "If you believe content on MyFitPick infringes your rights, contact us with enough information to identify the content, explain the concern, and verify that you are the rights owner or authorized to act for the rights owner."
        ]
      },
      {
        title: "Repeat violations",
        body: [
          "Accounts that repeatedly violate intellectual property rights may be limited or closed."
        ]
      }
    ]
  }
};

export const legalPolicyOrder: LegalPolicyId[] = [
  "privacy",
  "terms",
  "cookies",
  "acceptable-use",
  "ai-virtual-try-on",
  "subscription-and-credits",
  "refund",
  "copyright-ip"
];

export const legalPolicyList = legalPolicyOrder.map((id) => legalPolicies[id]);

export function getLegalPolicy(id: LegalPolicyId) {
  return legalPolicies[id];
}
