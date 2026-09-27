// SSO extension point (future): Entra ID / Google Workspace / LDAP.
// This module intentionally exists NOW so credentials-only assumptions
// never leak into the session/user model. Wire providers in auth.ts.

export type SsoProvider = "entra-id" | "google" | "ldap" | "sso";

export const SSO_PROVIDERS: { id: SsoProvider; label: string; enabled: boolean }[] = [
  { id: "entra-id", label: "Microsoft Entra ID", enabled: false },
  { id: "google", label: "Google Workspace", enabled: false },
  { id: "ldap", label: "LDAP / Active Directory", enabled: false },
  { id: "sso", label: "Generic SSO", enabled: false },
];

export function isSsoEnabled(): boolean {
  return SSO_PROVIDERS.some((p) => p.enabled);
}
