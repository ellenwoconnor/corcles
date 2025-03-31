import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { storage } from "./storage";
import { User as SelectUser, insertUserSchema } from "@shared/schema";
import logger from './logger';
import { hashPassword, comparePasswords } from './utils/auth';
import fetch from 'node-fetch';

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

// Add session type declaration
declare module 'express-session' {
  interface SessionData {
    pendingRegistration?: {
      username: string;
      email: string;
      password: string;
      displayName: string;
    };
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: true, // Changed to true to ensure session is created
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

  app.post("/api/register/complete", async (req, res, next) => {
    try {
      const { address, zipCode } = req.body;

      logger.info('Attempting to complete registration:', {
        sessionId: req.sessionID,
        hasPendingRegistration: !!req.session.pendingRegistration,
        session: req.session
      });

      if (!req.session.pendingRegistration) {
        logger.error('No pending registration found in session:', {
          sessionId: req.sessionID,
          session: req.session
        });
        return res.status(400).json({ error: "No pending registration found" });
      }

      if (!address || !zipCode) {
        return res.status(400).json({ error: "Address and zip code are required" });
      }

      // Validate zip code format
      if (!/^\d{5}$/.test(zipCode)) {
        return res.status(400).json({ error: "Zip code must be exactly 5 digits" });
      }

      const hashedPassword = await hashPassword(req.session.pendingRegistration.password);

      const user = await storage.createUser({
        ...req.session.pendingRegistration,
        password: hashedPassword,
        address,
        zipCode
      });

      // Clear the pending registration from session
      delete req.session.pendingRegistration;

      // Save session explicitly after clearing pending registration
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Log the user in
      req.login(user, (err) => {
        if (err) {
          logger.error('Error during login after registration completion:', {
            error: err,
            userId: user.id
          });
          return next(err);
        }

        logger.info('User registration completed successfully:', {
          userId: user.id,
          username: user.username
        });

        res.status(201).json(user);
      });
    } catch (error) {
      logger.error('Error completing registration:', error);
      next(error);
    }
  });

  app.post("/api/auth/google", async (req, res, next) => {
    try {
      const { accessToken, address, zipCode } = req.body;
      if (!accessToken) {
        return res.status(400).json({ error: "Access token is required" });
      }

      // Fetch user info from Google
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!response.ok) {
        logger.error('Failed to fetch Google user info:', {
          status: response.status,
          statusText: response.statusText
        });
        return res.status(401).json({ error: "Invalid access token" });
      }

      const googleUser = await response.json();
      logger.debug('Received Google user info:', { 
        email: googleUser.email,
        name: googleUser.name
      });

      // Find user by email
      let user = await storage.getUserByEmail(googleUser.email);

      if (!user) {
        // If no address/zipCode provided, return special response for client to collect info
        if (!address || !zipCode) {
          return res.status(202).json({
            needsAddressInfo: true,
            email: googleUser.email,
            name: googleUser.name,
            picture: googleUser.picture
          });
        }

        // Validate zip code
        if (!/^\d{5}$/.test(zipCode)) {
          return res.status(400).json({ error: "Zip code must be exactly 5 digits" });
        }

        // Create new user with address info
        const username = googleUser.email.split('@')[0];
        let uniqueUsername = username;
        let counter = 1;

        // Ensure username is unique
        while (await storage.getUserByUsername(uniqueUsername)) {
          uniqueUsername = `${username}${counter}`;
          counter++;
        }

        user = await storage.createUser({
          username: uniqueUsername,
          displayName: googleUser.name,
          email: googleUser.email,
          password: await hashPassword(Math.random().toString(36)),
          address: address,
          zipCode: zipCode,
          avatarUrl: googleUser.picture || null
        });

        logger.info('Created new user from Google auth:', {
          userId: user.id,
          email: user.email,
          zipCode: zipCode
        });
      } else if (!user.zipCode && (address && zipCode)) {
        // Update existing user who didn't have address info
        user.address = address;
        user.zipCode = zipCode;

        logger.info('Updated existing Google user with address info:', {
          userId: user.id,
          email: user.email,
          zipCode
        });
      } else if (!user.zipCode) {
        // Existing user without address info needs to provide it
        return res.status(202).json({
          needsAddressInfo: true,
          email: googleUser.email,
          name: googleUser.name,
          picture: googleUser.picture,
          userId: user.id
        });
      }

      // Log the user in
      req.login(user, (err) => {
        if (err) {
          logger.error('Error during Google auth login:', {
            error: err,
            userId: user.id
          });
          return next(err);
        }
        res.json(user);
      });

    } catch (error) {
      logger.error('Error during Google authentication:', error);
      next(error);
    }
  });

  app.post("/api/login", async (req, res, next) => {
    try {
      const { username, password } = req.body;
      logger.debug('Login attempt:', { username });

      const user = await storage.getUserByUsername(username) || await storage.getUserByEmail(username);
      
      if (!user) {
        logger.warn('Login failed - user not found:', { username });
        return res.status(401).json({ error: "Invalid username or password" });
      }

      const isValidPassword = await comparePasswords(password, user.password);
      if (!isValidPassword) {
        logger.warn('Login failed - invalid password:', { username });
        return res.status(401).json({ error: "Invalid username or password" });
      }

      req.login(user, (err) => {
        if (err) {
          logger.error('Error establishing session:', { error: err, userId: user.id });
          return next(err);
        }
        logger.info('User logged in successfully:', {
          userId: user.id,
          username: user.username
        });
        res.status(200).json(user);
      });
    } catch (error) {
      logger.error('Error during login:', error);
      next(error);
    }
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