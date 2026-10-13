import { useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { Seo } from "@/components/Seo"

import { ProfileForm } from "@/features/auth/components/ProfileForm"
import { useSession } from "@/features/auth/hooks/useSession"
import { quackKeys } from "@/features/quack/api/quackKeys"

export const Route = createFileRoute("/_ProtectedPages/settings")({
  component: SettingsPage,
})

function SettingsPage() {
  // The protected layout guarantees a session before this renders.
  const { user } = useSession()
  const queryClient = useQueryClient()

  return (
    <>
      <Seo title="Settings" />
      <section className="mx-auto w-full max-w-2xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">Settings</h1>
        {user ? (
          <ProfileForm
            user={user}
            // The feed shows each author's name and username.
            onSaved={() => void queryClient.invalidateQueries({ queryKey: quackKeys.all() })}
          />
        ) : null}
      </section>
    </>
  )
}
