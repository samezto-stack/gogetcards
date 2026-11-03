/**
 * Three secrets, hardcoded as fallbacks. Two are SHARED across every partner
 * site (EXPERIENCE_API_KEY, THANK_YOU_SIGNING_SECRET — the latter must equal
 * gogetcards'). One is UNIQUE to this site (EXPERIENCE_SIGNING_SECRET).
 * Committed values are valid only while this repo is private; if it ever goes
 * public, rotate the shared pair across the network. Each can still be
 * overridden per-environment via process.env.
 */
export const EXPERIENCE_API_KEY = process.env.EXPERIENCE_API_KEY || '__GGC_EXPERIENCE_API_KEY__';
export const THANK_YOU_SIGNING_SECRET =
  process.env.THANK_YOU_SIGNING_SECRET || '__GGC_THANK_YOU_SIGNING_SECRET__';
export const EXPERIENCE_SIGNING_SECRET =
  process.env.EXPERIENCE_SIGNING_SECRET || 'b138178b40230232c7edc9c8dea83b3feb1da7d8933db6e240a6f01c2152b65e';
