import { z } from "zod"

// Mirrors the server-side rule (QUACK_TEXT_MAX_LENGTH, trimmed, not blank) so
// the user is told before the request is made — the server still validates
// independently. A quack and a reply follow the same rule.
export const QUACK_TEXT_MAX_LENGTH = 280

export const quackTextSchema = z
  .string()
  .trim()
  .min(1, "Write something first")
  .max(QUACK_TEXT_MAX_LENGTH, `Keep it under ${QUACK_TEXT_MAX_LENGTH} characters`)
