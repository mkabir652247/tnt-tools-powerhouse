import { test } from "node:test";
import assert from "node:assert/strict";
import { canManageProducts, canDeleteCategories } from "./catalog-permissions";

test("product sub-admins can edit and delete products", () => {
  assert.equal(canManageProducts(["product_manager"]), true);
});
test("customers and ordinary staff cannot manage products", () => {
  assert.equal(canManageProducts(["customer"]), false);
  assert.equal(canManageProducts(["staff"]), false);
  assert.equal(canManageProducts([]), false);
});
test("category deletion remains full-admin only", () => {
  assert.equal(canDeleteCategories(["admin"]), true);
  assert.equal(canDeleteCategories(["product_manager"]), false);
});