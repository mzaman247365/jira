import type { Express, RequestHandler } from "express";
import session from "express-session";
import { authStorage, type IAuthStorage } from "./storage";

const isLocal = !process.env.REPL_ID;

let _setupAuth: (app: Express) => Promise<void>;
let _isAuthenticated: RequestHandler;
let _registerAuthRoutes: (app: Express) => void;

if (isLocal) {
  const LOCAL_USER_ID = "local-dev-user";

  _setupAuth = async (app: Express) => {
    app.use(
      session({
        secret: "local-dev-secret",
        resave: false,
        saveUninitialized: false,
      })
    );

    // Auto-create a local dev user and attach to every request
    await authStorage.upsertUser({
      id: LOCAL_USER_ID,
      email: "dev@localhost",
      firstName: "Local",
      lastName: "Developer",
      profileImageUrl: null,
    });

    app.use((req: any, _res, next) => {
      req.user = { claims: { sub: LOCAL_USER_ID } };
      req.isAuthenticated = () => true;
      next();
    });
  };

  _isAuthenticated = (_req, _res, next) => next();

  _registerAuthRoutes = (app: Express) => {
    app.get("/api/auth/user", async (_req, res) => {
      const user = await authStorage.getUser(LOCAL_USER_ID);
      res.json(user);
    });
    app.get("/api/login", (_req, res) => res.redirect("/"));
    app.get("/api/logout", (_req, res) => res.redirect("/"));
  };
} else {
  const replit = require("./replitAuth");
  _setupAuth = replit.setupAuth;
  _isAuthenticated = replit.isAuthenticated;

  const routes = require("./routes");
  _registerAuthRoutes = routes.registerAuthRoutes;
}

export const setupAuth = _setupAuth;
export const isAuthenticated = _isAuthenticated;
export const registerAuthRoutes = _registerAuthRoutes;
export { authStorage, type IAuthStorage } from "./storage";
