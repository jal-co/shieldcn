"use client"

/**
 * shieldcn
 * components/auth/members-manager.tsx
 *
 * Team member management — invite by email + role, change roles, remove
 * members, and cancel pending invitations. Backed by the Neon Auth (Better
 * Auth) organization API. Admin/owner-only actions are gated on the current
 * user's role. When there's no active team, prompts the user to create one.
 */

import { useState } from "react"
import { Loader2, Mail, Trash2, UserPlus, Users } from "lucide-react"
import { authClient } from "@/lib/auth/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { CreateOrgDialog } from "@/components/auth/create-org-dialog"

type Role = "member" | "admin" | "owner"

export function MembersManager() {
  const { data: activeOrg, refetch } = authClient.useActiveOrganization()
  const { data: activeMember } = authClient.useActiveMemberRole()
  const [createOpen, setCreateOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<Role>("member")
  const [inviting, setInviting] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const myRole = (activeMember?.role ?? "member") as Role
  const canManage = myRole === "owner" || myRole === "admin"

  // No active team → personal account. Offer to create one.
  if (!activeOrg) {
    return (
      <>
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border px-6 py-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Users className="size-6 text-muted-foreground" />
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">Collaborate with a team</h2>
            <p className="mx-auto max-w-sm text-sm text-muted-foreground">
              You&apos;re on your personal account. Create a team to invite people
              and share brands and saved READMEs together.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <UserPlus className="size-4" /> Create a team
          </Button>
        </div>
        <CreateOrgDialog open={createOpen} onOpenChange={setCreateOpen} />
      </>
    )
  }

  const members = activeOrg.members ?? []
  const invitations = (activeOrg.invitations ?? []).filter((i) => i.status === "pending")

  async function invite(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setInviting(true)
    try {
      const res = await authClient.organization.inviteMember({ email: email.trim(), role })
      if (res.error) throw new Error(res.error.message ?? "invite failed")
      toast.success(`Invited ${email.trim()}`)
      setEmail("")
      await refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "invite failed")
    } finally {
      setInviting(false)
    }
  }

  async function removeMember(memberIdOrEmail: string) {
    setBusyId(memberIdOrEmail)
    try {
      const res = await authClient.organization.removeMember({ memberIdOrEmail })
      if (res.error) throw new Error(res.error.message ?? "remove failed")
      toast.success("Member removed")
      await refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "remove failed")
    } finally {
      setBusyId(null)
    }
  }

  async function changeRole(memberId: string, next: Role) {
    setBusyId(memberId)
    try {
      const res = await authClient.organization.updateMemberRole({ memberId, role: next })
      if (res.error) throw new Error(res.error.message ?? "update failed")
      toast.success("Role updated")
      await refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "update failed")
    } finally {
      setBusyId(null)
    }
  }

  async function cancelInvite(invitationId: string) {
    setBusyId(invitationId)
    try {
      const res = await authClient.organization.cancelInvitation({ invitationId })
      if (res.error) throw new Error(res.error.message ?? "cancel failed")
      toast.success("Invitation canceled")
      await refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "cancel failed")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Invite */}
      {canManage && (
        <section className="flex flex-col gap-2">
          <Label>Invite a teammate</Label>
          <form onSubmit={invite} className="flex flex-wrap items-center gap-2">
            <Input
              type="email"
              placeholder="teammate@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="min-w-56 flex-1"
              required
            />
            <select
              className="h-9 rounded-md border border-border bg-transparent px-2 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <Button type="submit" disabled={inviting}>
              {inviting ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
              Send invite
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">
            Members can edit brands and READMEs. Admins can also invite and remove people.
          </p>
        </section>
      )}

      {/* Members */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Members ({members.length})
        </h2>
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {members.map((m) => {
            const mRole = m.role as Role
            const isOwner = mRole === "owner"
            return (
              <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">{m.user?.name || m.user?.email}</span>
                  <span className="truncate text-xs text-muted-foreground">{m.user?.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  {canManage && !isOwner ? (
                    <select
                      className="h-8 rounded-md border border-border bg-transparent px-2 text-xs"
                      value={mRole}
                      disabled={busyId === m.id}
                      onChange={(e) => changeRole(m.id, e.target.value as Role)}
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    <Badge variant={isOwner ? "default" : "outline"} className="capitalize">
                      {mRole}
                    </Badge>
                  )}
                  {canManage && !isOwner && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      disabled={busyId === m.id}
                      onClick={() => removeMember(m.id)}
                      aria-label="Remove member"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Pending invitations ({invitations.length})
          </h2>
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {invitations.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm">{inv.email}</span>
                  <span className="text-xs capitalize text-muted-foreground">{inv.role}</span>
                </div>
                {canManage && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground"
                    disabled={busyId === inv.id}
                    onClick={() => cancelInvite(inv.id)}
                  >
                    Cancel
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
