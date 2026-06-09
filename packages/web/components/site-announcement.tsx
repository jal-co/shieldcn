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
        <Link href="/docs/badges/skills" className="hover:underline underline-offset-4">
          New: skills.sh badges — skill installs, rank &amp; audits
          <ArrowRight className="size-3" />
        </Link>
      </AnnouncementContent>
    </Announcement>
  )
}
