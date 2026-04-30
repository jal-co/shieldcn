import { getRecentGenUsers } from "@shieldcn/core/gen-users"
import { GenUsersStack } from "@/components/gen-users-stack"

export async function GenUsersSection() {
  const users = await getRecentGenUsers(30)
  if (users.length === 0) return null

  return <GenUsersStack users={users} />
}
