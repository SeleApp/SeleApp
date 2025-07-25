import { Router } from "express";
import bcrypt from "bcrypt";
import { storage } from "../storage";
import { generateToken } from "../middleware/auth";
import { loginSchema, insertUserSchema } from "@shared/schema";

const router = Router();

router.post("/login", async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    
    const user = await storage.getUserByEmail(email);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Credenziali non valide" });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: "Credenziali non valide" });
    }

    const token = generateToken(user.id);
    
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(400).json({ message: "Dati di login non validi" });
  }
});

router.post("/register", async (req, res) => {
  try {
    const userData = insertUserSchema.parse(req.body);
    
    const existingUser = await storage.getUserByEmail(userData.email);
    if (existingUser) {
      return res.status(409).json({ message: "Email già registrata" });
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    const user = await storage.createUser({
      ...userData,
      password: hashedPassword,
      role: 'HUNTER',
      isActive: true,
    });

    const token = generateToken(user.id);
    
    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(400).json({ message: "Errore durante la registrazione" });
  }
});

export default router;
