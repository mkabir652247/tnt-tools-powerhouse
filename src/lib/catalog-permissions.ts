export function canManageProducts(roles: readonly string[]) {
  return roles.includes("admin") || roles.includes("product_manager");
}

export function canDeleteCategories(roles: readonly string[]) {
  return roles.includes("admin");
}