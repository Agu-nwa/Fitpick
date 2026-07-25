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
