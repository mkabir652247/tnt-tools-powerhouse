import { expect, test } from "bun:test";
import { SHIPPING_FEE } from "./shipping";

test("every order has the requested flat Rs 645 shipping charge", () => {
  expect(SHIPPING_FEE).toBe(645);
});