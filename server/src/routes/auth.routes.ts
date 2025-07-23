import { Router } from "express";
import { AuthController } from "../controllers/auth.contoller";

const router = Router();

router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.get("/verify-email", AuthController.verifyEmail);
router.post("/resend-verification", AuthController.resendVerificationEmail);
router.get("/me", AuthController.getProfile);

export default router;
