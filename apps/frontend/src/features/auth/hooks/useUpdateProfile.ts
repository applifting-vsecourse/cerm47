import { useMutation, useQueryClient } from "@tanstack/react-query"

import { authKeys } from "@/lib/auth-keys"
import { NO_MOOD } from "@/lib/mood"

import { type ProfileValues } from "@/features/auth/api/profileSchemas"
import { authClient } from "@/features/auth/lib/auth-client"

/** Error codes (from the server) that belong next to the username field. */
const USERNAME_ERROR_CODES = new Set([
  "USERNAME_IS_ALREADY_TAKEN",
  "USERNAME_TOO_SHORT",
  "USERNAME_TOO_LONG",
  "INVALID_USERNAME",
])

export class ProfileUpdateError extends Error {
  readonly isUsernameError: boolean

  constructor(message: string, code?: string) {
    super(message)
    this.name = "ProfileUpdateError"
    this.isUsernameError = code !== undefined && USERNAME_ERROR_CODES.has(code)
  }
}

// Only the fields that changed are sent, so an untouched legacy username is
// never re-validated.
export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (changes: Partial<ProfileValues>) => {
      const { error } = await authClient.updateUser({
        ...(changes.name === undefined ? {} : { name: changes.name }),
        ...(changes.username === undefined ? {} : { username: changes.username }),
        ...(changes.bio === undefined ? {} : { bio: changes.bio }),
        ...(changes.defaultMood === undefined
          ? {}
          : { defaultMood: changes.defaultMood === NO_MOOD ? null : changes.defaultMood }),
      })
      if (error) {
        throw new ProfileUpdateError(error.message ?? "Could not save settings", error.code)
      }
    },
    onSuccess: async () => {
      // The header menu reads the session, so the new username shows up there
      // straight away.
      await queryClient.invalidateQueries({ queryKey: authKeys.session() })
    },
  })
}
