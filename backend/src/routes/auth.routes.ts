import { Router } from "express";
import { signIn,signOut,signUp,getMe,} from "../controllers/auth.controller";
import authMiddleWare from "../middleware/auth.middleware";

const authRoutes = Router();

authRoutes.post("/signup", signUp);
authRoutes.post("/signin", signIn);

authRoutes.get("/me", authMiddleWare, getMe);
authRoutes.post("/signout", authMiddleWare, signOut);

export default authRoutes;