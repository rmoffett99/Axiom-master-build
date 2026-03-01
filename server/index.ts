import 'dotenv/config'
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import pgSession from "connect-pg-simple";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { seedDatabase } from "./seed";
import { i } from 'node_modules/vite/dist/node/chunks/moduleRunnerTransport';

const app = express();
const httpServer = createServer(app);

let isShuttingDown = false;
let inFlightRequests = 0;

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

declare module "express-session" {
  interface SessionData {
    demoUser?: {
      name: string;
      email: string;
      company: string;
      role: string;
      orgSlug: string;
      createdAt: string;
    };
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

app.get("/healthz", (_req, res) => {
  res.status(200).send("ok");
});

app.get("/readyz", (_req, res) => {
  res.status(200).send("ready");
});

app.use((req, res, next) => {
  if (isShuttingDown) {
    if (req.path.startsWith("/api")) {
      res.set("Retry-After", "2");
      return res.status(503).json({ error: "server_restarting", retryAfterSeconds: 2 });
    }
    return res.status(503).send("Service Unavailable");
  }
  inFlightRequests++;
  const onDone = () => {
    inFlightRequests--;
    res.removeListener("finish", onDone);
    res.removeListener("close", onDone);
  };
  res.on("finish", onDone);
  res.on("close", onDone);
  next();
});

const PgStore = pgSession(session);

app.use(
  session({
    store: new PgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || "axiom-demo-session-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: "lax",
    },
  }),
);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.

 const port = Number(process.env.PORT || 5000);

httpServer.listen(port, () => {
  log(`serving on port ${port}`);
});

  const shutdown = (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    log(`${signal} received, shutting down gracefully`);
    httpServer.close(() => {
      log("HTTP server closed");
    });
    let waited = 0;
    const drainInterval = setInterval(() => {
      if (inFlightRequests <= 0 || waited >= 25000) {
        clearInterval(drainInterval);
        log(`Drain complete (in-flight: ${inFlightRequests}, waited: ${waited}ms)`);
      }
      waited += 250;
    }, 250);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
})();
