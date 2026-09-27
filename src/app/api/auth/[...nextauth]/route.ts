import { handlers } from "@/auth";

/**
 * Auth.js request handlers — mandatory catch-all route.
 * Serves /api/auth/csrf, /callback/*, /session, /signout, /providers, ...
 * Without this file no sign-in, session refresh, or client auth works.
 */
export const { GET, POST } = handlers;
