import { Router } from "express";
import { createHash, timingSafeEqual } from "node:crypto";

const router = Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

function makeToken() {
  return createHash("sha256").update(`lab-rec:${ADMIN_PASSWORD}`).digest("hex");
}

export function verifyAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const expected = Buffer.from(makeToken());
  const actual = Buffer.from(token);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return res.status(401).json({ message: "Unauthorized — please log in" });
  }
  next();
}

router.post("/login", (req, res) => {
  if (!ADMIN_PASSWORD) {
    return res
      .status(500)
      .json({ message: "ADMIN_PASSWORD is not set on the server" });
  }
  const { password } = req.body || {};
  const actual = Buffer.from(typeof password === "string" ? password : "");
  const expected = Buffer.from(ADMIN_PASSWORD);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return res.status(401).json({ message: "Wrong password" });
  }
  res.json({ token: makeToken() });
});

export default router;
