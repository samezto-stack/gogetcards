"use strict";

/**
 * Tiny leveled logger with secret redaction. Wraps any console-like object
 * (defaults to console). It never logs token values or secrets: pass
 * structured metadata and it redacts known-sensitive keys.
 */
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 99 };
const SENSITIVE = /(secret|token|apikey|api_key|authorization|cookie|password)/i;

function redact(value) {
  if (value == null) return value;
  if (typeof value !== "object") return value;
  const out = Array.isArray(value) ? [] : {};
  for (const key of Object.keys(value)) {
    out[key] = SENSITIVE.test(key) ? "[redacted]" : redact(value[key]);
  }
  return out;
}

function createLogger(options) {
  const opts = options || {};
  const sink = opts.sink || console;
  const prefix = opts.prefix || "[experience-engine]";
  const threshold = LEVELS[opts.level] != null ? LEVELS[opts.level] : LEVELS.info;

  function emit(level, message, meta) {
    if (LEVELS[level] < threshold) return;
    const fn = sink[level] || sink.log || function () {};
    if (meta !== undefined) {
      fn.call(sink, prefix + " " + message, redact(meta));
    } else {
      fn.call(sink, prefix + " " + message);
    }
  }

  return {
    debug: (m, meta) => emit("debug", m, meta),
    info: (m, meta) => emit("info", m, meta),
    warn: (m, meta) => emit("warn", m, meta),
    error: (m, meta) => emit("error", m, meta),
    redact,
  };
}

module.exports = { createLogger, redact, LEVELS };
