import { Router } from "express";
import { createHash, timingSafeEqual } from "node:crypto";

const router = Router();

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || "";
}

function makeToken() {
  const adminPassword = getAdminPassword();
  return createHash("sha256").update(`lab-rec:${adminPassword}`).digest("hex");
}

export function verifyAuth(req, res, next) {
  const adminPassword = getAdminPassword();
  if (!adminPassword) {
    return res.status(500).json({
      message: "ADMIN_PASSWORD is not set on the server environment variables.",
    });
  }
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
  const adminPassword = getAdminPassword();
  if (!adminPassword) {
    return res.status(500).json({
      message: "ADMIN_PASSWORD is not configured on the server environment variables.",
    });
  }
  const { password } = req.body || {};
  const actual = Buffer.from(typeof password === "string" ? password : "");
  const expected = Buffer.from(adminPassword);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return res.status(401).json({ message: "Wrong password" });
  }
  res.json({ token: makeToken() });
});

export default router;
