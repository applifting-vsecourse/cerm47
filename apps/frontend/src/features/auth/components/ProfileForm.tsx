import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQueryClient } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"

import { MoodPicker } from "@/components/MoodPicker"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { authKeys } from "@/lib/auth-keys"
import { NO_MOOD } from "@/lib/mood"
import { cn } from "@/lib/utils"

import type { Session, SessionUser } from "@/features/auth/api/authSessionQueryOptions"
import {
  BIO_MAX_LENGTH,
  profileSchema,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  type ProfileValues,
} from "@/features/auth/api/profileSchemas"
import { ProfileUpdateError, useUpdateProfile } from "@/features/auth/hooks/useUpdateProfile"

export function toFormValues(user: SessionUser): ProfileValues {
  return {
    name: user.name,
    username: user.username,
    bio: user.bio,
    defaultMood: user.defaultMood ?? NO_MOOD,
  }
}

type ProfileFormProps = {
  /** The saved profile — the form starts from it and "Discard" returns to it. */
  user: SessionUser
  className?: string
  /** Called after the profile was saved. */
  onSaved?: () => void
}

export function ProfileForm({ user, className, onSaved }: ProfileFormProps) {
  const queryClient = useQueryClient()
  const updateProfile = useUpdateProfile()
  const [status, setStatus] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: toFormValues(user),
  })

  const bio = useWatch({ control: form.control, name: "bio" })
  const bioLength = bio?.length ?? 0

  const handleSubmit = async (values: ProfileValues) => {
    setStatus(null)
    setFormError(null)

    const saved = toFormValues(user)
    const changes: Partial<ProfileValues> = {}
    if (values.name !== saved.name) changes.name = values.name
    if (values.username !== saved.username) changes.username = values.username
    if (values.bio !== saved.bio) changes.bio = values.bio
    if (values.defaultMood !== saved.defaultMood) changes.defaultMood = values.defaultMood

    if (Object.keys(changes).length === 0) {
      setStatus("There are no changes to save.")
      return
    }

    try {
      await updateProfile.mutateAsync(changes)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save settings"
      // The typed value stays in the field; only the message is added.
      if (error instanceof ProfileUpdateError && error.isUsernameError) {
        form.setError("username", { message })
      } else {
        setFormError(message)
      }
      return
    }

    // The server normalises the username (lower case), so start over from what
    // was actually saved rather than from what was typed.
    const session = queryClient.getQueryData<Session>(authKeys.session())
    form.reset(session ? toFormValues(session.user) : values)
    setStatus("Your settings are saved.")
    onSaved?.()
  }

  const handleDiscard = () => {
    form.reset(toFormValues(user))
    setStatus(null)
    setFormError(null)
  }

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(handleSubmit)}
        onChange={() => setStatus(null)}
        className={cn("space-y-8", className)}
      >
        {status ? (
          <Alert role="status">
            <AlertDescription>{status}</AlertDescription>
          </Alert>
        ) : null}
        {formError ? (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Profile</h2>

          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input
                    autoComplete="username"
                    disabled={updateProfile.isPending}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  {USERNAME_MIN_LENGTH}–{USERNAME_MAX_LENGTH} characters: letters, numbers, dots and
                  underscores.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Display name</FormLabel>
                <FormControl>
                  <Input
                    autoComplete="name"
                    disabled={updateProfile.isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bio (optional)</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    disabled={updateProfile.isPending}
                    {...field}
                  />
                </FormControl>
                <FormDescription className={cn(bioLength > BIO_MAX_LENGTH && "text-destructive")}>
                  {bioLength}/{BIO_MAX_LENGTH}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Posting</h2>

          <FormField
            control={form.control}
            name="defaultMood"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Default mood for new quacks</FormLabel>
                <FormControl>
                  <MoodPicker
                    value={field.value}
                    onChange={field.onChange}
                    disabled={updateProfile.isPending}
                    hasLabels
                    hasNoneOption
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDiscard}
            disabled={updateProfile.isPending}
          >
            Discard changes
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={updateProfile.isPending}
          >
            {updateProfile.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Save changes
          </Button>
        </div>
      </form>
    </Form>
  )
}
