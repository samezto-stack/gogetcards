// Type declarations for experience-engine.

export interface CookieOptions {
  name?: string;
  ttlMs?: number;
  secure?: "auto" | boolean;
  sameSite?: "Lax" | "Strict" | "None";
  path?: string;
  domain?: string;
}

export interface ExperienceInput {
  id: string;
  traits?: Record<string, unknown>;
}

export interface EngineOptions {
  /** Signs tokens + cookies. Server-side only. Required. */
  secret: string;
  /** Shared secret authorizing the internal token issuer. Required. */
  apiKey: string;
  /** Experience ids beyond the implicit "default". */
  experiences?: Array<string | ExperienceInput>;
  /** Whitelist of extra signed claim names a token may carry (e.g. ["email"]). */
  passthroughClaims?: string[];
  tokenTtlMs?: number;
  tokenParam?: string;
  defaultExperienceId?: string;
  cookie?: CookieOptions;
  logger?: { info: Function; warn: Function; error: Function; debug?: Function };
  level?: "debug" | "info" | "warn" | "error" | "silent";
}

export interface Experience {
  id: string;
  traits: Record<string, unknown>;
}

export type ExperienceSource = "token" | "cookie" | "default";

export interface ResolveResult {
  experience: Experience;
  source: ExperienceSource;
  /** Signed passthrough claims carried by the token (e.g. { email }); {} otherwise. */
  claims: Record<string, unknown>;
}

export interface RequestLike {
  query?: Record<string, unknown>;
  headers?: { cookie?: string; authorization?: string };
  body?: unknown;
  secure?: boolean;
  get?: (name: string) => string | undefined;
}

export interface ResponseLike {
  statusCode?: number;
  setHeader(name: string, value: unknown): void;
  getHeader?(name: string): unknown;
  append?(name: string, value: unknown): void;
  end(payload?: string): unknown;
}

export type Middleware = (req: any, res: any, next: (err?: any) => void) => void;

export interface Engine {
  config: Readonly<Record<string, any>>;
  logger: any;
  errors: Record<string, any>;
  catalog: {
    has(id: string): boolean;
    isIssuable(id: string): boolean;
    publicView(id: string): Experience;
    ids(): string[];
    DEFAULT_ID: string;
  };
  token: {
    issue(experienceId: string, extraClaims?: Record<string, unknown>): string | null;
    verify(token: string): Record<string, any> | null;
  };
  cookie: {
    name: string;
    read(req: RequestLike): string | null;
    sign(experienceId: string): string;
    set(res: ResponseLike, experienceId: string, req?: RequestLike): void;
    clear(res: ResponseLike): void;
  };
  resolve(req: RequestLike): ResolveResult;
  variants: { load(absPath: string): string; clear(): void };
  html: {
    cleanupSnippet(): string;
    injectCleanup(html: string): string;
    injectClaims(html: string, claims: Record<string, unknown>): string;
  };
  middleware: {
    internalAuth: Middleware;
    resolve(options?: { persistCookie?: boolean; noStore?: boolean }): Middleware;
  };
  handlers: {
    issueToken: (req: RequestLike, res: ResponseLike) => void;
  };
}

export function createExperienceEngine(options: EngineOptions): Engine;
export function createConfigFromEnv(env: Record<string, string | undefined>): Partial<EngineOptions>;
export function validateEnv(env: Record<string, string | undefined>): { ok: boolean; errors: string[] };
export const ENV: Record<string, string>;
export const DEFAULTS: Record<string, any>;
export const errors: Record<string, any>;
export const token: {
  generateToken(secret: string, claims: object, opts: { ttlMs: number }): string;
  verifyToken(secret: string, token: string): Record<string, any> | null;
};
