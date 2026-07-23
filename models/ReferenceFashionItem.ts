import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const ReferenceDetectedItemSchema = new Schema(
  {
    id: { type: String, required: true, trim: true, maxlength: 80 },
    label: { type: String, required: true, trim: true, maxlength: 120 },
    category: { type: String, default: "", trim: true, maxlength: 40 },
    subcategory: { type: String, default: "", trim: true, maxlength: 80 },
    primaryColor: { type: String, default: "", trim: true, maxlength: 60 },
    confidence: { type: Number, default: 0, min: 0, max: 1 }
  },
  { _id: false }
);

const ReferenceFashionItemSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    conversationId: { type: String, required: true, trim: true, maxlength: 120, index: true },
    imageUrl: { type: String, required: true, trim: true, maxlength: 1000 },
    storageKey: { type: String, required: true, trim: true, maxlength: 512 },
    source: { type: String, enum: ["camera", "upload"], default: "upload" },
    status: {
      type: String,
      enum: ["uploaded", "analyzing", "needs-selection", "ready", "failed"],
      default: "uploaded",
      index: true
    },
    category: {
      type: String,
      enum: ["tops", "bottoms", "dresses", "outerwear", "shoes", "bags", "accessories", ""],
      default: "",
      index: true
    },
    subcategory: { type: String, default: "", trim: true, maxlength: 80 },
    primaryColor: { type: String, default: "", trim: true, maxlength: 60 },
    secondaryColors: { type: [String], default: [] },
    pattern: { type: String, default: "", trim: true, maxlength: 80 },
    fabric: { type: String, default: "", trim: true, maxlength: 120 },
    silhouette: { type: String, default: "", trim: true, maxlength: 120 },
    fit: { type: String, default: "", trim: true, maxlength: 80 },
    formality: { type: String, default: "", trim: true, maxlength: 80 },
    styles: { type: [String], default: [] },
    occasions: { type: [String], default: [] },
    weather: { type: [String], default: [] },
    seasons: { type: [String], default: [] },
    detectedItems: { type: [ReferenceDetectedItemSchema], default: [] },
    selectedDetectedItemId: { type: String, default: "", trim: true, maxlength: 80 },
    imageQuality: { type: Schema.Types.Mixed, default: {} },
    usableForMatching: { type: Boolean, default: false },
    usableForTryOn: { type: Boolean, default: false },
    warnings: { type: [String], default: [] },
    analysisSummary: { type: String, default: "", trim: true, maxlength: 500 },
    analysisProvider: { type: String, default: "", trim: true, maxlength: 40 },
    analysisModel: { type: String, default: "", trim: true, maxlength: 80 },
    analyzedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null, index: true },
    convertedWardrobeUploadId: { type: Schema.Types.ObjectId, ref: "WardrobeUpload", default: null, index: true }
  },
  { timestamps: true }
);

ReferenceFashionItemSchema.index({ userId: 1, conversationId: 1, createdAt: -1 });
ReferenceFashionItemSchema.index({ userId: 1, status: 1, updatedAt: -1 });

export type ReferenceFashionItemDocument = InferSchemaType<typeof ReferenceFashionItemSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ReferenceFashionItem =
  (mongoose.models.ReferenceFashionItem as Model<ReferenceFashionItemDocument>) ||
  mongoose.model<ReferenceFashionItemDocument>("ReferenceFashionItem", ReferenceFashionItemSchema);
