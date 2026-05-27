/**
 * @shieldcn/core
 * src/providers/shipperclub
 *
 * Static badge provider for shipper.club membership.
 * No API — returns a fixed "MEMBER" badge.
 */

import type { BadgeData } from "../badges/types"

/**
 * Returns a static shipper.club member badge.
 */
export function getShipperClubMember(): BadgeData {
  return {
    label: "",
    value: "member of shipper.club",
  }
}
