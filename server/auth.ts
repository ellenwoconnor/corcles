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

// No need for pendingRegistration in session anymore
declare module 'express-session' {
  interface SessionData {
    // Keep empty for now, might add other session data later if needed
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
        address: null,
        zipCode: null
      });

      logger.info('User registered successfully:', {
        userId: user.id,
        username: user.username,
        zipCode: null
      });

      // Process invite code if it exists
      if (parseResult.data.pendingInviteCode) {
        try {
          const community = await storage.getCommunityByInviteCode(parseResult.data.pendingInviteCode);
          if (community) {
            await storage.addUserToCommunity(user.id, community.id);
            logger.info('User added to community via invite code during registration:', {
              userId: user.id,
              communityId: community.id,
              inviteCode: parseResult.data.pendingInviteCode
            });
          } else {
            logger.warn('Invalid invite code used during registration:', {
              userId: user.id,
              inviteCode: parseResult.data.pendingInviteCode
            });
          }
        } catch (inviteError) {
          logger.error('Error processing invite code during registration:', {
            error: inviteError,
            userId: user.id,
            inviteCode: parseResult.data.pendingInviteCode
          });
          // Continue with registration even if invite code processing fails
        }
      }

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

  // New endpoint for updating user profile - handles address and zipCode
  app.patch("/api/user", async (req, res, next) => {
    try {
      // Ensure user is authenticated
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { address, zipCode, pendingInviteCode } = req.body;

      // Validate required fields
      if (!address || !zipCode) {
        return res.status(400).json({ error: "Address and zip code are required" });
      }

      // Validate zip code format
      if (!/^\d{5}$/.test(zipCode)) {
        return res.status(400).json({ error: "Zip code must be exactly 5 digits" });
      }

      logger.info('Updating user profile with address information:', {
        userId: req.user.id,
        zipCode,
        hasPendingInvite: !!pendingInviteCode
      });

      // Update the user record
      const updatedUser = await storage.updateUser(req.user.id, {
        address,
        zipCode
      });

      logger.info('User profile updated successfully:', {
        userId: updatedUser.id,
        zipCode: updatedUser.zipCode
      });

      // Process invite code if it exists
      // Is this code redundant? It's already processed during registration
      if (pendingInviteCode) {
        try {
          const inviteCommunity = await storage.getCommunityByInviteCode(pendingInviteCode);
          if (inviteCommunity) {
            const isUserInInviteCommunity = await storage.isUserInCommunity(req.user.id, inviteCommunity.id);
            if (!isUserInInviteCommunity) {
              await storage.addUserToCommunity(req.user.id, inviteCommunity.id, 'member');
              logger.info('User added to community via invite code during profile update:', {
                userId: req.user.id,
                communityId: inviteCommunity.id,
                inviteCode: pendingInviteCode
              });
            }
          } else {
            logger.warn('Invalid invite code used during profile update:', {
              userId: req.user.id,
              inviteCode: pendingInviteCode
            });
          }
        } catch (inviteError) {
          logger.error('Error processing invite code during profile update:', {
            error: inviteError,
            userId: req.user.id,
            inviteCode: pendingInviteCode
          });
          // Continue with address update even if invite code processing fails
        }
      }

      // Add user to appropriate community based on zip code
      try {
        // First, check if community exists for this zip code
        let community = await storage.getCommunityByZipCode(zipCode);
        
        // If no community exists, create one
        if (!community) {
          community = await storage.createCommunity({
            name: `Community ${zipCode}`,
            description: `Local community for ${zipCode}`,
            mascot: "🏠", // Default mascot for auto-created communities
            createdBy: req.user.id,
            isCustom: false
          });
          
          logger.info('Created new community for zip code:', {
            zipCode,
            communityId: community.id
          });
        }
        
        // Add user to community
        const isUserInCommunity = await storage.isUserInCommunity(req.user.id, community.id);
        if (!isUserInCommunity) {
          await storage.addUserToCommunity(req.user.id, community.id, 'member');
          logger.info('Added user to community:', {
            userId: req.user.id,
            communityId: community.id
          });
        }
      } catch (communityError) {
        logger.error('Error adding user to community:', {
          error: communityError,
          userId: req.user.id,
          zipCode
        });
        // Don't fail the whole request if community assignment fails
      }

      res.status(200).json(updatedUser);
    } catch (error) {
      logger.error('Error updating user profile:', error);
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

      const googleUser = await response.json() as { email: string; name: string; picture?: string };
      logger.debug('Received Google user info:', { 
        email: googleUser.email,
        name: googleUser.name
      });

      // Find or create user
      let user = await storage.getUserByEmail(googleUser.email);

      if (!user) {
        // Create new user without address info
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
          address: null,
          zipCode: null,
          avatarUrl: googleUser.picture || null
        });

        logger.info('Created new user from Google auth:', {
          userId: user.id,
          email: user.email
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

  app.get("/api/user", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // Get user communities
      const userCommunities = await storage.getUserCommunities(req.user.id);
      const communityIds = userCommunities.map(community => community.id);
      
      // Return user with community information
      res.json({
        ...req.user,
        communityIds
      });
    } catch (error) {
      logger.error('Error fetching user with communities:', { error, userId: req.user.id });
      res.json(req.user);
    }
  });
}