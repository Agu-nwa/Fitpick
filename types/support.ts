export type SupportConversationStatus = "open" | "pending" | "resolved";
export type SupportSenderType = "user" | "support";
export type SupportAvailability = "online" | "offline";

export type SupportAttachment = {
  key: string;
  url: string;
  filename: string;
  mimeType: "image/jpeg" | "image/webp";
  size: number;
  width: number;
  height: number;
};

export type SupportMessage = {
  id: string;
  conversationId: string;
  senderType: SupportSenderType;
  senderId: string;
  body: string;
  attachments: SupportAttachment[];
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SupportInternalNote = {
  id: string;
  conversationId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type SupportOperationalContext = {
  user: {
    id: string;
    name: string;
    email: string;
    role: "user" | "admin";
    accountStatus: "active";
    credits: number;
    joinedAt: string | null;
    lastLoginAt: string | null;
    modelSetupCompletedAt: string | null;
  };
  wardrobe: {
    itemCount: number;
    readyCount: number;
    needsCareCount: number;
    latestUploads: Array<{
      id: string;
      category: string;
      uploadStatus: string;
      aiTagStatus: string;
      enrichmentStatus: string;
      safeIssue: string;
      createdAt: string;
      updatedAt: string;
    }>;
  };
  tryOn: {
    latest: Array<{
      id: string;
      generationId: string;
      status: string;
      failureStage: string;
      failureCode: string;
      safeIssue: string;
      creditsReserved: number;
      creditsCommitted: number;
      creditsReleased: number;
      createdAt: string;
      completedAt: string | null;
      failedAt: string | null;
    }>;
  };
  outfits: {
    latest: Array<{
      id: string;
      title: string;
      source: string;
      occasion: string;
      previewStatus: string;
      completenessStatus: string;
      createdAt: string;
    }>;
  };
  matchOutfit: {
    latest: Array<{
      id: string;
      status: string;
      category: string;
      primaryColor: string;
      usableForMatching: boolean;
      recommendationCount: number;
      createdAt: string;
    }>;
  };
  jobs: {
    latest: Array<{
      id: string;
      type: string;
      status: string;
      attempts: number;
      safeIssue: string;
      createdAt: string;
      updatedAt: string;
    }>;
  };
  credits: {
    latestTransactions: Array<{
      id: string;
      feature: string;
      credits: number;
      status: string;
      balanceAfter: number | null;
      createdAt: string;
    }>;
    latestPurchases: Array<{
      id: string;
      packName: string;
      credits: number;
      amountMinor: number;
      currency: string;
      provider: string;
      status: string;
      createdAt: string;
    }>;
  };
};

export type SupportConversationSummary = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: SupportConversationStatus;
  assignedAgentId: string | null;
  assignedAgentName: string | null;
  lastMessageAt: string | null;
  latestMessagePreview: string;
  userUnreadCount: number;
  supportUnreadCount: number;
  createdAt: string;
  updatedAt: string;
};

export type SupportConversationDetail = {
  conversation: SupportConversationSummary;
  messages: SupportMessage[];
  availability: SupportAvailability;
};

export type SupportMessageAck = {
  message: SupportMessage;
  conversation: SupportConversationSummary;
  deduplicated?: boolean;
};

export type SupportUnreadUpdate = {
  conversationId: string;
  userUnreadCount: number;
  supportUnreadCount: number;
};

export type SupportSocketError = {
  code: "unauthorized" | "forbidden" | "validation" | "rate_limited" | "disabled" | "unavailable";
  message: string;
};
