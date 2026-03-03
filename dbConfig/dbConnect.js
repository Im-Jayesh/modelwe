import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    throw new Error("Please define the MONGODB_URI environment variable");
}

// 1. GLOBAL CACHE TRICK
// We check if a mongoose connection already exists in the global Node object.
// This prevents Next.js from creating a new connection every time you save a file in development.
let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
    // 2. USE EXISTING POOL
    // If we already have a connection, return it immediately. Do not open a new one.
    if (cached.conn) {
        return cached.conn;
    }

    // 3. CREATE THE POOL (Only happens once)
    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
            
            // --- THE POOLING MAGIC ---
            // Maintain up to 50 active connections in the pool. 
            // If request 51 comes in, it waits in line for a fraction of a second until one frees up.
            maxPoolSize: 50, 
            
            // Always keep 10 connections open and ready, even if traffic is low.
            minPoolSize: 10, 
            
            // How long to wait before timing out a slow query (5 seconds)
            serverSelectionTimeoutMS: 5000, 
        };

        cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
            console.log("✅ MongoDB Connection Pool Established");
            return mongoose;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        throw e;
    }

    return cached.conn;
}

export default dbConnect;