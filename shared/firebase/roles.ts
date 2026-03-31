import type { UserRole } from "../catalog/models";

export type AuthClaims = {
  role?: UserRole;
};

export function isAdminRole(role?: string): role is "admin" {
  return role === "admin";
}

export function getRoleFromClaims(claims?: AuthClaims) {
  return claims?.role === "admin" ? "admin" : "customer";
}
