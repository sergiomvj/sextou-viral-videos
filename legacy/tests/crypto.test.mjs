import test from "node:test";
import assert from "node:assert/strict";

process.env.APP_ENCRYPTION_KEY = "test-secret";

const { encryptSecret, decryptSecret } = await import("../lib/crypto.ts");

test("encryptSecret and decryptSecret preserve the original value", () => {
  const original = "sk-or-v1-123456789";
  const encrypted = encryptSecret(original);
  assert.notEqual(encrypted, original);
  assert.equal(decryptSecret(encrypted), original);
});

test("decryptSecret returns null for empty payload", () => {
  assert.equal(decryptSecret(null), null);
});
