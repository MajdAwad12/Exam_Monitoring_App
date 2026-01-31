// server/index.js
import path from "path";
import { fileURLToPath } from "url";
import http from "http";

import express from "express";
import compression from "compression";
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
expressApp.get("/health", (_, res) => res.json({ ok: true, ts: new Date().toISOString() }));

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
     ✅ FIX: atomic update (no exam.save) to avoid VersionError:
     "No matching document found for id ... version ..."
  ========================= */
  const ALERTS = [
    { min: 30, key: "m30", type: "EXAM_30_MIN_LEFT" },
    { min: 15, key: "m15", type: "EXAM_15_MIN_LEFT" },
    { min: 5, key: "m5", type: "EXAM_5_MIN_LEFT" },
  ];

  let timerBusy = false;

  setInterval(async () => {
    if (timerBusy) return;
    timerBusy = true;

    try {
      const nowMs = Date.now();

      // lean + minimal fields (fast, avoids mongoose doc versioning)
      const exams = await Exam.find({ status: "running" })
        .select("_id endAt report.summary.timeAlerts")
        .lean();

      for (const exam of exams) {
        if (!exam?.endAt) continue;

        const endMs = new Date(exam.endAt).getTime();
        if (!Number.isFinite(endMs)) continue;

        const remainingMs = endMs - nowMs;
        if (remainingMs <= 0) continue;

        const timeAlerts = exam?.report?.summary?.timeAlerts || {};

        for (const a of ALERTS) {
          const shouldFire = remainingMs <= a.min * 60 * 1000;
          const alreadyFired = Boolean(timeAlerts?.[a.key]);
          if (!shouldFire || alreadyFired) continue;

          const at = new Date();

          // atomic: set flag + push timeline + push event
          const filter = {
            _id: exam._id,
            status: "running",
            [`report.summary.timeAlerts.${a.key}`]: { $ne: true },
          };

          const update = {
            $set: { [`report.summary.timeAlerts.${a.key}`]: true },
            $push: {
              "report.timeline": {
                kind: a.type,
                at,
                roomId: null,
                actor: { id: null, name: "system", role: "system" },
                student: null,
                details: { minutesLeft: a.min },
              },
              events: {
                type: a.type,
                timestamp: at,
                severity: "medium",
                description: `${a.min} minutes remaining`,
                classroom: "",
                seat: "",
                studentId: null,
              },
            },
          };

          const r = await Exam.updateOne(filter, update);

          // only broadcast if we actually updated (prevents duplicate pushes)
          if (r?.modifiedCount === 1) {
            globalThis.__wss?.clients?.forEach((c) => {
              if (c.readyState === WebSocket.OPEN) {
                c.send(
                  JSON.stringify({
                    type: "EXAM_UPDATED",
                    examId: String(exam._id),
                    at: at.toISOString(),
                    reason: "time_alert",
                    minutesLeft: a.min,
                  })
                );
              }
            });

            // update local cached flag so we don't try again in same loop
            timeAlerts[a.key] = true;
          }
        }
      }
    } catch (err) {
      console.error("⛔ Exam timer failed:", err?.message || err);
    } finally {
      timerBusy = false;
    }
  }, 30000);

  httpServer.listen(port, () => console.log("🚀 Server running on", port));
}

start();
