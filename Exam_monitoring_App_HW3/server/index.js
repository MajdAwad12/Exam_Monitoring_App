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

import Exam from "./src/models/Exam.js";
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
   Trust proxy
========================= */
if (isProd) expressApp.set("trust proxy", 1);

/* =========================
   Body parser
========================= */
expressApp.use(express.json());

/* =========================
   Health
========================= */
expressApp.get("/health", (_, res) =>
  res.json({ ok: true, ts: new Date().toISOString() })
);

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
      return cb(new Error("CORS blocked"));
    },
    credentials: true,
  })
);

/* =========================
   Session
========================= */
expressApp.use(
  session({
    name: "sid",
    secret: process.env.SESSION_SECRET || "dev",
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
   Routes
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
   START SERVER
========================= */
async function start() {
  await connectDB();
  const port = process.env.PORT || 5000;

  const httpServer = http.createServer(expressApp);
  const wsServer = new WebSocketServer({ server: httpServer, path: "/ws" });
  globalThis.__wss = wsServer;

  wsServer.on("connection", (socket) => {
    socket.send(JSON.stringify({ type: "WELCOME" }));
    const ping = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) socket.ping();
    }, 30000);
    socket.on("close", () => clearInterval(ping));
  });

  /* =========================
     ⏱️ EXAM TIME ALERT TIMER
  ========================= */
  setInterval(async () => {
    const now = Date.now();
    const exams = await Exam.find({ status: "running" });

    for (const exam of exams) {
      if (!exam.endAt) continue;

      const remainingMs = new Date(exam.endAt).getTime() - now;
      if (remainingMs <= 0) continue;

      exam.report = exam.report || {};
      exam.report.summary = exam.report.summary || {};
      exam.report.summary.timeAlerts ||= {};

      const alerts = [
        { min: 30, key: "m30", type: "EXAM_30_MIN_LEFT" },
        { min: 15, key: "m15", type: "EXAM_15_MIN_LEFT" },
        { min: 5, key: "m5", type: "EXAM_5_MIN_LEFT" },
      ];

      for (const a of alerts) {
        if (
          remainingMs <= a.min * 60 * 1000 &&
          !exam.report.summary.timeAlerts[a.key]
        ) {
          exam.report.timeline.push({
            kind: a.type,
            at: new Date(),
            details: { minutesLeft: a.min },
          });

          exam.events.push({
            type: a.type,
            timestamp: new Date(),
            severity: "medium",
            description: `${a.min} minutes remaining`,
          });

          exam.report.summary.timeAlerts[a.key] = true;

          globalThis.__wss?.clients.forEach((c) => {
            if (c.readyState === WebSocket.OPEN) {
              c.send(JSON.stringify({ type: "EXAM_UPDATED" }));
            }
          });
        }
      }

      exam.markModified("report");
      exam.markModified("events");
      await exam.save();
    }
  }, 30000); // כל 30 שניות

  httpServer.listen(port, () =>
    console.log("🚀 Server running on", port)
  );
}

start();
