import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import logger from './logger';

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      const user = await storage.getUserByUsername(username);
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false);
      } else {
        return done(null, user);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  app.post("/api/register", async (req, res, next) => {
    const existingUser = await storage.getUserByUsername(req.body.username);
    if (existingUser) {
      logger.warn('Registration attempt with existing username:', {
        username: req.body.username,
        ip: req.ip
      });
      return res.status(400).send("Username already exists");
    }

    // Check for existing address
    const existingAddress = await storage.getUserByAddress(req.body.address);
    if (existingAddress) {
      logger.warn('Registration attempt with existing address:', {
        address: req.body.address,
        ip: req.ip
      });
      return res.status(400).send("Address is already registered to another user");
    }

    try {
      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      logger.info('User registered successfully:', {
        userId: user.id,
        username: user.username,
        community: user.community
      });

      req.login(user, (err) => {
        if (err) {
          logger.error('Error during login after registration:', {
            error: err,
            userId: user.id
          });
          return next(err);
        }
        res.status(201).json(user);
      });
    } catch (error) {
      logger.error('Error during user registration:', {
        error,
        username: req.body.username
      });
      next(error);
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    logger.info('User logged in:', {
      userId: req.user.id,
      username: req.user.username
    });
    res.status(200).json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    const userId = req.user?.id;
    const username = req.user?.username;

    req.logout((err) => {
      if (err) {
        logger.error('Error during logout:', {
          error: err,
          userId,
          username
        });
        return next(err);
      }
      logger.info('User logged out:', { userId, username });
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}