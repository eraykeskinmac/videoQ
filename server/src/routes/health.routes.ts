import { Router } from "express";
import { successResponse } from "../utils/response";

const router = Router();

router.get("/", (req, res) => {
  res.json(
    successResponse({
      status: "ok",
      timestamp: new Date().toISOString(),
      enviorment: process.env.NODE_ENV,
    })
  );
});

export default router;
