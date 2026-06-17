import mongoose from "mongoose";

type CachedConnection = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as typeof globalThis & {
  mongooseConnection?: CachedConnection;
};

const cached: CachedConnection =
  globalForMongoose.mongooseConnection ?? { conn: null, promise: null };

globalForMongoose.mongooseConnection = cached;

export function hasMongoUri() {
  return Boolean(process.env.MONGODB_URI);
}

export async function connectDB() {
  if (cached.conn) return cached.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not configured.");
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 8000
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
