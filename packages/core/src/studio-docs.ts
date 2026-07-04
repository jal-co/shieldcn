/**
 * @shieldcn/core
 * src/studio-docs.ts
 *
 * Saved Studio documents (Plus+). Lifts the Studio's local session snapshot
 * into Postgres so a user's work syncs across devices. Ownership is by org.
 */

import { query, initDB } from "./db"

/**
 * Saved-document caps. Free gets a small cloud allowance so signing up is
 * worthwhile (the account-creation hook); paid plans raise it.
 */
export const FREE_DOC_LIMIT = 2
export const PLUS_DOC_LIMIT = 50

/** Saved-README cap for a plan. Single source of truth for route + dashboard. */
export function docLimitForPlan(plan: string): number {
  if (plan === "plus") return PLUS_DOC_LIMIT
  return FREE_DOC_LIMIT
}

export interface StudioDoc {
  id: number
  ownerId: string
  userId: string | null
  name: string
  doc: unknown
  updatedAt: string
}

interface DocRow {
  id: string | number
  owner_id: string
  user_id: string | null
  name: string
  doc: unknown
  updated_at: string | Date
}

function rowToDoc(row: DocRow): StudioDoc {
  return {
    id: Number(row.id),
    ownerId: row.owner_id,
    userId: row.user_id,
    name: row.name,
    doc: row.doc,
    updatedAt: new Date(row.updated_at).toISOString(),
  }
}

export async function listDocs(ownerId: string): Promise<StudioDoc[]> {
  // Fail-open: a DB blip on a dashboard read shows an empty list, never a
  // crashed page (the write paths still surface real errors).
  try {
    await initDB()
    const { rows } = await query<DocRow>(
      `SELECT id, owner_id, user_id, name, doc, updated_at
         FROM studio_documents WHERE owner_id = $1 ORDER BY updated_at DESC`,
      [ownerId],
    )
    return rows.map(rowToDoc)
  } catch {
    return []
  }
}

export async function getDoc(ownerId: string, id: number): Promise<StudioDoc | null> {
  await initDB()
  const { rows } = await query<DocRow>(
    `SELECT id, owner_id, user_id, name, doc, updated_at
       FROM studio_documents WHERE id = $1 AND owner_id = $2`,
    [id, ownerId],
  )
  return rows[0] ? rowToDoc(rows[0]) : null
}

export async function countDocs(ownerId: string): Promise<number> {
  await initDB()
  const { rows } = await query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM studio_documents WHERE owner_id = $1`,
    [ownerId],
  )
  return Number(rows[0]?.n ?? 0)
}

/**
 * Create a new saved document. Enforces `limit` (the plan's cap) — throws
 * "doc limit reached" when the org is already at the cap.
 */
export async function createDoc(
  ownerId: string,
  userId: string | null,
  name: string,
  doc: unknown,
  limit: number,
): Promise<StudioDoc> {
  if ((await countDocs(ownerId)) >= limit) {
    throw new Error("doc limit reached")
  }
  const { rows } = await query<DocRow>(
    `INSERT INTO studio_documents (owner_id, user_id, name, doc)
       VALUES ($1, $2, $3, $4::jsonb)
     RETURNING id, owner_id, user_id, name, doc, updated_at`,
    [ownerId, userId, name.slice(0, 200), JSON.stringify(doc)],
  )
  return rowToDoc(rows[0])
}

export async function updateDoc(
  ownerId: string,
  id: number,
  name: string,
  doc: unknown,
): Promise<StudioDoc | null> {
  const { rows } = await query<DocRow>(
    `UPDATE studio_documents SET name = $3, doc = $4::jsonb, updated_at = NOW()
      WHERE id = $1 AND owner_id = $2
     RETURNING id, owner_id, user_id, name, doc, updated_at`,
    [id, ownerId, name.slice(0, 200), JSON.stringify(doc)],
  )
  return rows[0] ? rowToDoc(rows[0]) : null
}

export async function deleteDoc(ownerId: string, id: number): Promise<boolean> {
  const { rowCount } = await query(
    `DELETE FROM studio_documents WHERE id = $1 AND owner_id = $2`,
    [id, ownerId],
  )
  return (rowCount ?? 0) > 0
}
