import fs from "fs";
import http from "http";
import path from "path";
import { config as loadDotenv } from "dotenv";
import { Server } from "socket.io";
import { connectDB } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { logSafeError } from "@/lib/security/safe-log";
import { getSupportAllowedOrigins, getSupportRealtimePort, isSupportChatEnabled } from "@/lib/support/config";
import { authenticateSupportSocket } from "@/lib/support/socket-auth";
import {
  createSupportMessage,
  getOrCreateSupportConversation,
  getSupportConversationForActor,
  isSupportAgent,
  markSupportMessagesRead,
  serializeSupportConversation,
  supportAvailabilityFromAgentCount
} from "@/lib/support/support-service";
import { supportMessageBodySchema, supportSocketJoinSchema, supportSocketReadSchema, supportSocketTypingSchema } from "@/schemas/support.schema";
import type { SupportSocketError } from "@/types/support";

const envPath = path.join(process.cwd(), ".env");
const envLocalPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) loadDotenv({ path: envPath, override: false, quiet: true });
if (fs.existsSync(envLocalPath)) loadDotenv({ path: envLocalPath, override: false, quiet: true });

const service = "fitpick.support.realtime";
const port = getSupportRealtimePort();
const supportAgents = new Set<string>();
const typingTimers = new Map<string, NodeJS.Timeout>();

function logInfo(event: string, metadata: Record<string, unknown> = {}) {
  console.info(service, { event, ...metadata, timestamp: new Date().toISOString() });
}

function socketError(message: string, code: SupportSocketError["code"] = "unavailable"): SupportSocketError {
  return { code, message };
}

function room(conversationId: string) {
  return `support:conversation:${conversationId}`;
}

function userRoom(userId: string) {
  return `support:user:${userId}`;
}

function adminRoom() {
  return "support:agents";
}

async function emitAvailability(io: Server) {
  io.emit("support:availability", { availability: supportAvailabilityFromAgentCount(supportAgents.size) });
}

if (!isSupportChatEnabled()) {
  logInfo("disabled", { reason: "SUPPORT_CHAT_ENABLED=false" });
  process.exit(0);
}

const httpServer = http.createServer((request, response) => {
  if (request.url === "/healthz") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true, service, supportAgents: supportAgents.size, timestamp: new Date().toISOString() }));
    return;
  }
  response.writeHead(404, { "content-type": "application/json" });
  response.end(JSON.stringify({ ok: false }));
});

const allowedOrigins = getSupportAllowedOrigins();
const io = new Server(httpServer, {
  cors: {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("origin_not_allowed"));
    },
    credentials: true
  },
  transports: ["websocket", "polling"]
});

io.use(async (socket, next) => {
  const ip = socket.handshake.address || "unknown";
  const limited = rateLimit({ key: `support-socket:${ip}`, limit: 30, windowMs: 60_000, operation: "support-socket" });
  if (limited) return next(new Error("rate_limited"));

  try {
    const token = typeof socket.handshake.auth?.token === "string" ? socket.handshake.auth.token : undefined;
    const authenticated = await authenticateSupportSocket({ token, cookieHeader: socket.handshake.headers.cookie });
    socket.data.actor = { userId: authenticated.actor.userId, role: authenticated.actor.role, email: authenticated.actor.email };
    return next();
  } catch (error) {
    logSafeError("support.socket.auth", error, { socketId: socket.id });
    return next(new Error("unauthorized"));
  }
});

io.on("connection", async (socket) => {
  const actor = socket.data.actor as { userId: string; role: "user" | "admin"; email: string };
  socket.join(userRoom(actor.userId));
  if (isSupportAgent(actor)) {
    supportAgents.add(socket.id);
    socket.join(adminRoom());
    void emitAvailability(io);
  }
  logInfo("connection", { socketId: socket.id, actorRole: actor.role, actorId: actor.userId });

  socket.on("support:join", async (payload, ack) => {
    try {
      await connectDB();
      const parsed = supportSocketJoinSchema.safeParse(payload || {});
      if (!parsed.success) throw new Error("validation");
      const conversation = parsed.data.conversationId
        ? await getSupportConversationForActor({ conversationId: parsed.data.conversationId, actor })
        : isSupportAgent(actor)
          ? null
          : await getOrCreateSupportConversation(actor.userId);
      if (!conversation) throw new Error("forbidden");
      socket.join(room(String(conversation._id)));
      const summary = serializeSupportConversation(conversation);
      ack?.({ ok: true, conversation: summary });
      socket.emit("support:conversation:update", summary);
    } catch (error) {
      logSafeError("support.socket.join", error, { socketId: socket.id, actorRole: actor.role });
      const response = socketError("Unable to open this support conversation.", "forbidden");
      ack?.({ ok: false, error: response });
      socket.emit("support:error", response);
    }
  });

  socket.on("support:message:send", async (payload, ack) => {
    try {
      const parsed = supportMessageBodySchema.safeParse(payload || {});
      if (!parsed.success || typeof payload?.conversationId !== "string") throw new Error("validation");
      const result = await createSupportMessage({ conversationId: payload.conversationId, actor, body: parsed.data.body, attachments: parsed.data.attachments, idempotencyKey: parsed.data.idempotencyKey });
      io.to(room(result.conversation.id)).emit("support:message:new", result);
      io.to(adminRoom()).emit("support:conversation:update", result.conversation);
      io.to(userRoom(result.conversation.userId)).emit("support:conversation:update", result.conversation);
      ack?.({ ok: true, ...result });
      logInfo("message.persisted", { conversationId: result.conversation.id, actorRole: actor.role, deduplicated: Boolean(result.deduplicated) });
    } catch (error) {
      logSafeError("support.socket.message", error, { socketId: socket.id, actorRole: actor.role });
      const response = socketError("Unable to send your message right now.", "unavailable");
      ack?.({ ok: false, error: response });
      socket.emit("support:error", response);
    }
  });

  socket.on("support:typing:start", (payload) => {
    const parsed = supportSocketTypingSchema.safeParse({ ...payload, isTyping: true });
    if (!parsed.success) return;
    const key = `${socket.id}:${parsed.data.conversationId}`;
    clearTimeout(typingTimers.get(key));
    socket.to(room(parsed.data.conversationId)).emit("support:typing", { conversationId: parsed.data.conversationId, actorRole: actor.role, isTyping: true });
    typingTimers.set(key, setTimeout(() => socket.to(room(parsed.data.conversationId)).emit("support:typing", { conversationId: parsed.data.conversationId, actorRole: actor.role, isTyping: false }), 5000));
  });

  socket.on("support:typing:stop", (payload) => {
    const parsed = supportSocketTypingSchema.safeParse({ ...payload, isTyping: false });
    if (!parsed.success) return;
    socket.to(room(parsed.data.conversationId)).emit("support:typing", { conversationId: parsed.data.conversationId, actorRole: actor.role, isTyping: false });
  });

  socket.on("support:messages:read", async (payload, ack) => {
    try {
      const parsed = supportSocketReadSchema.safeParse(payload || {});
      if (!parsed.success) throw new Error("validation");
      const conversation = await markSupportMessagesRead({ conversationId: parsed.data.conversationId, actor });
      io.to(room(conversation.id)).emit("support:unread:update", { conversationId: conversation.id, userUnreadCount: conversation.userUnreadCount, supportUnreadCount: conversation.supportUnreadCount });
      io.to(adminRoom()).emit("support:conversation:update", conversation);
      ack?.({ ok: true, conversation });
    } catch (error) {
      logSafeError("support.socket.read", error, { socketId: socket.id, actorRole: actor.role });
      ack?.({ ok: false, error: socketError("Unable to update read state right now.") });
    }
  });

  socket.on("disconnect", () => {
    if (isSupportAgent(actor)) {
      supportAgents.delete(socket.id);
      void emitAvailability(io);
    }
    for (const [key, timer] of Array.from(typingTimers.entries())) {
      if (key.startsWith(`${socket.id}:`)) {
        clearTimeout(timer);
        typingTimers.delete(key);
      }
    }
    logInfo("disconnect", { socketId: socket.id, actorRole: actor.role });
  });
});

httpServer.listen(port, () => {
  logInfo("listening", { port, allowedOriginCount: allowedOrigins.length });
});
