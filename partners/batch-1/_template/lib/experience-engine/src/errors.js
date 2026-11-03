"use strict";

/**
 * Typed error classes so consumers can branch on failure kind without string
 * matching. All extend EngineError. None of these ever carry secrets.
 */
class EngineError extends Error {
  constructor(message, code) {
    super(message);
    this.name = this.constructor.name;
    this.code = code || "ENGINE_ERROR";
  }
}

/** Thrown at construction time when configuration is invalid. */
class ConfigError extends EngineError {
  constructor(message) {
    super(message, "CONFIG_ERROR");
  }
}

/** The shared API key was missing or did not match (internal auth). */
class UnauthorizedError extends EngineError {
  constructor(message) {
    super(message || "unauthorized", "UNAUTHORIZED");
  }
}

/** A requested experience id is not in the configured catalog. */
class UnknownExperienceError extends EngineError {
  constructor(message) {
    super(message || "unknown experience", "UNKNOWN_EXPERIENCE");
  }
}

module.exports = {
  EngineError,
  ConfigError,
  UnauthorizedError,
  UnknownExperienceError,
};
