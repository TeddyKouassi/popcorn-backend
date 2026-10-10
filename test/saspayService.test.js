import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import {
  formatPhoneNumber,
  verifyWebhookSignature,
} from "../src/services/saspayService.js";

test("formatPhoneNumber normalise des numéros béninois sans modifier le préfixe international", () => {
  assert.equal(formatPhoneNumber("97 00-00-00"), "+22997000000");
  assert.equal(formatPhoneNumber("0022997000000"), "+22997000000");
  assert.equal(formatPhoneNumber("+229 97 00 00 00"), "+22997000000");
});

test("verifyWebhookSignature accepte seulement le corps brut et la signature HMAC attendus", () => {
  const secret = "test-webhook-secret";
  const rawBody = Buffer.from('{"data":{"amount":"3500"}}');
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody.toString("utf8")}`)
    .digest("hex");

  assert.deepEqual(
    verifyWebhookSignature({
      signatureHeader: signature,
      timestampHeader: timestamp,
      rawBody,
      secret,
    }),
    { isValid: true },
  );

  assert.equal(
    verifyWebhookSignature({
      signatureHeader: `${signature[0] === "0" ? "1" : "0"}${signature.slice(1)}`,
      timestampHeader: timestamp,
      rawBody,
      secret,
    }).isValid,
    false,
  );
});
