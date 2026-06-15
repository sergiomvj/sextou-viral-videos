import test from "node:test";
import assert from "node:assert/strict";

const { isGoogleAuthConfigured } = await import("../lib/auth-flags.ts");

test("isGoogleAuthConfigured returns false without both env vars", () => {
  delete process.env.AUTH_GOOGLE_ID;
  delete process.env.AUTH_GOOGLE_SECRET;
  assert.equal(isGoogleAuthConfigured(), false);
});

test("isGoogleAuthConfigured returns true with both env vars", () => {
  process.env.AUTH_GOOGLE_ID = "client-id";
  process.env.AUTH_GOOGLE_SECRET = "client-secret";
  assert.equal(isGoogleAuthConfigured(), true);
});
