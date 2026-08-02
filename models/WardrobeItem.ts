import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const ImageVariantSchema = new Schema(
  {
    url: { type: String, default: "" },
    storageKey: { type: String, default: "" },
    provider: { type: String, default: "s3" },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    bytes: { type: Number, default: 0 },
    status: { type: String, enum: ["not_started", "processing", "ready", "failed", "unavailable"], default: "not_started" },
    processedAt: { type: Date, default: null },
    errorMessage: { type: String, default: "" }
  },
  { _id: false }
);

const WardrobeImageSchema = new Schema(
  {
    url: { type: String, default: "" },
    storageKey: { type: String, default: "" },
    provider: { type: String, default: "metadata" },
    uploadedAt: { type: Date, default: Date.now },
    purpose: {
      type: String,
      enum: ["front", "back", "fabricCloseUp", "label", "additional"],
      required: true
    },
    variants: {
      original: { type: ImageVariantSchema },
      thumbnail: { type: ImageVariantSchema }
    }
  },
  { _id: false }
);

const GarmentMeasurementsSchema = new Schema(
  {
    chestWidthCm: { type: Number, default: null, min: 10, max: 120 },
    shoulderWidthCm: { type: Number, default: null, min: 10, max: 90 },
    sleeveLengthCm: { type: Number, default: null, min: 5, max: 120 },
    bodyLengthCm: { type: Number, default: null, min: 10, max: 180 },
    waistCm: { type: Number, default: null, min: 20, max: 180 },
    hipsCm: { type: Number, default: null, min: 20, max: 200 },
    inseamCm: { type: Number, default: null, min: 10, max: 130 },
    outseamCm: { type: Number, default: null, min: 20, max: 160 },
    shoeLengthCm: { type: Number, default: null, min: 10, max: 40 },
    heelHeightCm: { type: Number, default: null, min: 0, max: 25 }
  },
  { _id: false }
);

const FootwearAttributesSchema = new Schema({
  toeStyle: { type: String, enum: ["open", "closed", "peep", "unknown"], default: "unknown" },
  heelHeight: { type: String, enum: ["flat", "low", "mid", "high", "unknown"], default: "unknown" },
  heelType: { type: String, default: "" },
  activity: { type: [String], default: [] },
  weatherSuitability: { type: [String], default: [] },
  comfortLevel: { type: String, enum: ["low", "medium", "high", "unknown"], default: "unknown" },
  trouserCompatibility: { type: [String], default: [] },
  dressCompatibility: { type: [String], default: [] }
}, { _id: false });

const WardrobeItemSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    storageKey: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    thumbnailUrl: { type: String, default: "" },
    images: {
      front: { type: WardrobeImageSchema },
      back: { type: WardrobeImageSchema },
      fabricCloseUp: { type: WardrobeImageSchema },
      label: { type: WardrobeImageSchema },
      additional: { type: [WardrobeImageSchema], default: [] }
    },
    category: {
      type: String,
      enum: ["tops", "bottoms", "dresses", "native", "outerwear", "shoes", "bags", "accessories", "womens_hair"],
      required: true
    },
    subcategory: { type: String, default: "" },
    canonicalSubtype: { type: String, default: "", index: true },
    structureRole: { type: String, default: "unknown", index: true },
    stylingRole: { type: String, default: "unknown", index: true },
    setComponents: { type: [String], default: [] },
    visibilityRole: { type: String, default: "unknown", index: true },
    occasionRange: { type: [String], default: [] },
    formalityLevel: { type: String, default: "" },
    taxonomyConfidence: { type: Number, default: 0, min: 0, max: 1 },
    taxonomyEvidence: { type: [String], default: [] },
    taxonomyNeedsReview: { type: Boolean, default: true, index: true },
    taxonomyStatus: { type: String, enum: ["confirmed", "inferred", "needs_review", "unresolved"], default: "unresolved", index: true },
    taxonomyConfirmedBy: { type: String, enum: ["user", "ai", "migration", "system"], default: "system" },
    taxonomyConfirmedAt: { type: Date, default: null },
    taxonomyVersion: { type: String, default: "" },
    taxonomyConflicts: { type: [String], default: [] },
    neckline: { type: String, enum: ["crew", "v_neck", "scoop", "square", "halter", "strapless", "off_shoulder", "collared", "high_neck", "boat", "sweetheart", "asymmetric", "other", "unknown"], default: "unknown" },
    accessoryScale: { type: String, enum: ["delicate", "small", "subtle", "medium", "statement", "unknown"], default: "unknown" },
    waistbandType: { type: String, enum: ["belt_loops", "elastic", "drawstring", "clean_waist", "integrated_belt", "unknown"], default: "unknown" },
    beltCompatible: { type: Boolean, default: null },
    cuffType: { type: String, enum: ["standard", "french_cuff", "convertible", "unknown"], default: "unknown" },
    supportsPocketSquare: { type: Boolean, default: null },
    hasLapel: { type: Boolean, default: null },
    garmentLength: { type: String, enum: ["mini", "knee", "midi", "maxi", "cropped", "ankle", "full_length", "unknown"], default: "unknown" },
    footwearAttributes: { type: FootwearAttributesSchema, default: () => ({}) },
    metadataSources: { type: Schema.Types.Mixed, default: {} },
    color: { type: String, default: "" },
    pattern: { type: String, default: "" },
    fabric: { type: String, default: "" },
    fit: { type: String, default: "" },
    taggedSize: { type: String, enum: ["XS", "S", "M", "L", "XL", "XXL", "custom", "unknown"], default: "unknown" },
    sizeSystem: { type: String, enum: ["US", "UK", "EU", "international", "custom", "unknown"], default: "unknown" },
    garmentFit: { type: String, enum: ["slim", "regular", "relaxed", "oversized", "tailored", "flowing", "unknown"], default: "unknown" },
    garmentMeasurements: { type: GarmentMeasurementsSchema, default: () => ({}) },
    stretchLevel: { type: String, enum: ["none", "low", "medium", "high", "unknown"], default: "unknown" },
    fabricDrape: { type: String, enum: ["structured", "soft", "flowing", "heavy", "stiff", "unknown"], default: "unknown" },
    fitConfidence: { type: Number, default: 0, min: 0, max: 1 },
    measurementSource: { type: String, enum: ["label_ocr", "user_confirmed", "ai_estimated", "manual", "unknown"], default: "unknown" },
    formality: { type: [String], default: [] },
    occasions: { type: [String], default: [] },
    weather: { type: [String], default: [] },
    userInputMetadata: { type: Schema.Types.Mixed, default: {} },
    categorySpecificMetadata: { type: Schema.Types.Mixed, default: {} },
    ocrMetadata: { type: Schema.Types.Mixed, default: {} },
    recommendationMetadata: { type: Schema.Types.Mixed, default: {} },
    virtualTryOnMetadata: { type: Schema.Types.Mixed, default: {} },
    searchMetadata: { type: Schema.Types.Mixed, default: {} },
    enrichmentStatus: { type: String, enum: ["not_started", "queued", "completed", "failed"], default: "not_started", index: true },
    verifiedMetadata: { type: Schema.Types.Mixed, default: {} },
    aiAnalysis: { type: Schema.Types.Mixed, default: null },
    condition: { type: String, enum: ["ready", "needs-care", "missing-tags"], default: "missing-tags" },
    timesWorn: { type: Number, default: 0, min: 0 },
    recommendationCount: { type: Number, default: 0, min: 0 },
    lastRecommendedAt: { type: Date, default: null },
    favoriteScore: { type: Number, default: 0, min: 0, max: 1 },
    versatilityScore: { type: Number, default: 0, min: 0, max: 1 },
    confidenceScore: { type: Number, default: 0, min: 0, max: 1 },
    lastWornAt: { type: Date },
    archivedAt: { type: Date }
  },
  { timestamps: true, optimisticConcurrency: true }
);

export type WardrobeItemDocument = InferSchemaType<typeof WardrobeItemSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const WardrobeItem =
  (mongoose.models.WardrobeItem as Model<WardrobeItemDocument>) ||
  mongoose.model<WardrobeItemDocument>("WardrobeItem", WardrobeItemSchema);
