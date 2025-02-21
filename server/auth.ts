import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { storage } from "./storage";
import { User as SelectUser, insertUserSchema } from "@shared/schema";
import logger from './logger';
import { hashPassword, comparePasswords } from './utils/auth';

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          logger.warn('Login attempt with non-existent username:', {
            username,
            timestamp: new Date().toISOString()
          });
          return done(null, false, { message: "Incorrect username or password" });
        }

        const isValidPassword = await comparePasswords(password, user.password);
        if (!isValidPassword) {
          logger.warn('Login attempt with incorrect password:', {
            username,
            timestamp: new Date().toISOString()
          });
          return done(null, false, { message: "Incorrect username or password" });
        }

        logger.info('User logged in successfully:', {
          userId: user.id,
          username: user.username
        });
        return done(null, user);
      } catch (error) {
        logger.error('Error during login:', { error, username });
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        logger.warn('Failed to deserialize user:', { userId: id });
        return done(null, false);
      }
      done(null, user);
    } catch (error) {
      logger.error('Error deserializing user:', { error, userId: id });
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const parseResult = insertUserSchema.safeParse(req.body);
      if (!parseResult.success) {
        logger.warn('Registration validation failed:', {
          errors: parseResult.error.errors,
          body: req.body
        });
        return res.status(400).json(parseResult.error);
      }

      const existingUser = await storage.getUserByUsername(parseResult.data.username);
      if (existingUser) {
        logger.warn('Registration attempt with existing username:', {
          username: parseResult.data.username,
          ip: req.ip
        });
        return res.status(400).json({ error: "Username already exists" });
      }

      const existingEmail = await storage.getUserByEmail(parseResult.data.email);
      if (existingEmail) {
        logger.warn('Registration attempt with existing email:', {
          email: parseResult.data.email,
          ip: req.ip
        });
        return res.status(400).json({ error: "Email already exists" });
      }

      const hashedPassword = await hashPassword(parseResult.data.password);
      const user = await storage.createUser({
        ...parseResult.data,
        password: hashedPassword,
      });

      logger.info('User registered successfully:', {
        userId: user.id,
        username: user.username
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

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        logger.error('Error during login:', { error: err });
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ error: info?.message || "Authentication failed" });
      }
      req.login(user, (err) => {
        if (err) {
          logger.error('Error establishing session:', { error: err, userId: user.id });
          return next(err);
        }
        logger.info('User logged in:', {
          userId: user.id,
          username: user.username
        });
        res.status(200).json(user);
      });
    })(req, res, next);
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