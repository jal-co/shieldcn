"use client"

import { useEffect, useState } from "react"
import { AvatarStack } from "@/components/shadcncraft/pro-marketing/avatar-stack"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

interface GenUser {
  owner: string
  avatar_url: string
  repo: string
  badge_count: number
}

export function GenUsersStack() {
  const [users, setUsers] = useState<GenUser[]>([])

  useEffect(() => {
    fetch("/api/gen-users")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.users)) setUsers(data.users)
      })
      .catch(() => {})
  }, [])

  if (users.length === 0) return null

  return (
    <div className="flex items-center gap-3">
      <AvatarStack max={8} size={28} overlapRatio={0.3}>
        {users.map((user) => (
          <Avatar key={user.owner}>
            <AvatarImage
              src={user.avatar_url}
              alt={user.owner}
            />
            <AvatarFallback className="text-[10px]">
              {user.owner.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ))}
      </AvatarStack>
      <p className="text-xs text-muted-foreground">
        {users.length === 1
          ? "1 user has"
          : `${users.length} users have`}{" "}
        generated badges
      </p>
    </div>
  )
}
