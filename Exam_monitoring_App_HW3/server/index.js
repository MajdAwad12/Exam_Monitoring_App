// server/index.js
import path from "path";
import { fileURLToPath } from "url";
import http from "http";

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";
import MongoStore from "connect-mongo";

import { WebSocketServer, WebSocket } from "ws";

import authRoutes from "./src/routes/auth.routes.js";
import { connectDB } from "./src/db/connectDB.js";
import dashboardRoutes from "./src/routes/dashboard.routes.js";
import transferRoutes from "./src/routes/transfers.routes.js";
import examsRoutes from "./src/routes/exams.routes.js";
import messagesRoutes from "./src/routes/messages.routes.js";
import incidentsRoutes from "./src/routes/incidents.routes.js";
import adminRoutes from "./src/routes/admin.routes.js";
import chatRoutes from "./src/routes/chat.routes.js";
import reportsRoutes from "./src/routes/reports.routes.js";
import studentRoutes from "./src/routes/student.routes.js";

dotenv.config();

const expressApp = express();
const isProd = process.env.NODE_ENV === "production";

/* =========================
   Trust proxy (Render / HTTPS cookies)
========================= */
if (isProd) {
  expressApp.set("trust proxy", 1);
}

/* =========================
   Body parser
========================= */
expressApp.use(express.json());

// =========================
// Health check
// =========================
expressApp.get("/health", (req, res) => {
  res.status(200).json({
    ok: true,
    service: "exam-monitoring-server",
    ts: new Date().toISOString(),
  });
});
expressApp.head("/health", (req, res) => res.sendStatus(200));



expressApp.get("/api/health", (req, res) => {
  res.status(200).json({
    ok: true,
    service: "exam-monitoring-server",
    ts: new Date().toISOString(),
  });
});
expressApp.head("/api/health", (req, res) => res.sendStatus(200));

/* =========================
   CORS
========================= */
const fromEnv = (process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const DEV_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"];
const ALLOWED_ORIGINS = new Set([...fromEnv, ...DEV_ORIGINS]);

expressApp.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (ALLOWED_ORIGINS.has(origin)) return cb(null, true);
      if (origin.endsWith(".vercel.app")) return cb(null, true);
      return cb(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
  })
);

/* =========================
   Session
========================= */
if (!process.env.MONGO_URI) {
  console.warn("⚠️ MONGO_URI is missing.");
}

expressApp.use(
  session({
    name: "sid",
    secret: process.env.SESSION_SECRET || "dev_secret",
    resave: false,
    saveUninitialized: false,
    proxy: isProd,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: "sessions",
    }),
    cookie: {
      httpOnly: true,
      sameSite: isProd ? "none" : "lax",
      secure: isProd,
      maxAge: 1000 * 60 * 60 * 2,
    },
  })
);

/* =========================
   API Routes
========================= */
expressApp.use("/api/auth", authRoutes);
expressApp.use("/api/dashboard", dashboardRoutes);
expressApp.use("/api/transfers", transferRoutes);
expressApp.use("/api/exams", examsRoutes);
expressApp.use("/api/messages", messagesRoutes);
expressApp.use("/api/incidents", incidentsRoutes);
expressApp.use("/api/admin", adminRoutes);
expressApp.use("/api/chat", chatRoutes);
expressApp.use("/api/reports", reportsRoutes);
expressApp.use("/api/student", studentRoutes);

/* =========================
   Serve React build (OPTIONAL)
========================= */
if (isProd && process.env.SERVE_CLIENT === "true") {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const distPath = path.join(__dirname, "..", "client", "dist");
  expressApp.use(express.static(distPath));

  expressApp.get(/^\/(?!api\/|assets\/).*/, (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

/* =========================
   START SERVER (HTTP + WS)
========================= */
async function start() {
  try {
    await connectDB();
    const port = process.env.PORT || 5000;

    // Create HTTP server
    const httpServer = http.createServer(expressApp);

    // Attach WebSocket server
    const wsServer = new WebSocketServer({ server: httpServer, path: "/ws" });
    globalThis.__wss = wsServer;

    wsServer.on("connection", (socket) => {
      console.log("🔌 WebSocket client connected");

      // ✅ send welcome message (useful for testing)
      socket.send(JSON.stringify({ type: "WELCOME", ts: new Date().toISOString() }));

      // ✅ keep-alive ping every 30s
      const interval = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.ping();
        }
      }, 30000);

      socket.on("message", (data) => {
        console.log("WS message:", data.toString());
      });

      socket.on("close", () => {
        clearInterval(interval);
        console.log("❌ WebSocket client disconnected");
      });
    });

    httpServer.listen(port, () =>
      console.log("🚀 Server (HTTP + WS) running on", port)
    );
  } catch (e) {
    console.log("❌ Server failed:", e.message);
    process.exit(1);
  }
}

start();
