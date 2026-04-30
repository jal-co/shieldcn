import Link from "next/link"
import { ArrowRight } from "lucide-react"
import {
  Announcement,
  AnnouncementBadge,
  AnnouncementContent,
} from "@/components/shadcncraft/pro-application/announcement"

export function SiteAnnouncement() {
  return (
    <Announcement>
      <AnnouncementBadge>New</AnnouncementBadge>
      <AnnouncementContent asChild>
        <Link href="/docs" className="hover:underline underline-offset-4">
          18 new providers — GitLab, Modrinth, Conda, and more
          <ArrowRight className="size-3" />
        </Link>
      </AnnouncementContent>
    </Announcement>
  )
}
