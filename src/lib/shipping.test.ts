import { test } from "node:test";
import { strict as assert } from "node:assert";
import { SHIPPING_FEE } from "./shipping";

test("every order has the requested flat Rs 645 shipping charge", () => {
  assert.equal(SHIPPING_FEE, 645);
});