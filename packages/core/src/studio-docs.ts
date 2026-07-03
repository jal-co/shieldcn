/**
 * @shieldcn/core
 * src/studio-docs.ts
 *
 * Saved Studio documents (Plus+). Lifts the Studio's local session snapshot
 * into Postgres so a user's work syncs across devices. Ownership is by org.
 */

import { query, initDB } from "./db"

/** Saved-document cap for the Plus plan at launch. */
export const PLUS_DOC_LIMIT = 2

export interface StudioDoc {
  id: number
  orgId: string
  userId: string | null
  name: string
  doc: unknown
  updatedAt: string
}

interface DocRow {
  id: string | number
  org_id: string
  user_id: string | null
  name: string
  doc: unknown
  updated_at: string | Date
}

function rowToDoc(row: DocRow): StudioDoc {
  return {
    id: Number(row.id),
    orgId: row.org_id,
    userId: row.user_id,
    name: row.name,
    doc: row.doc,
    updatedAt: new Date(row.updated_at).toISOString(),
  }
}

export async function listDocs(orgId: string): Promise<StudioDoc[]> {
  await initDB()
  const { rows } = await query<DocRow>(
    `SELECT id, org_id, user_id, name, doc, updated_at
       FROM studio_documents WHERE org_id = $1 ORDER BY updated_at DESC`,
    [orgId],
  )
  return rows.map(rowToDoc)
}

export async function getDoc(orgId: string, id: number): Promise<StudioDoc | null> {
  await initDB()
  const { rows } = await query<DocRow>(
    `SELECT id, org_id, user_id, name, doc, updated_at
       FROM studio_documents WHERE id = $1 AND org_id = $2`,
    [id, orgId],
  )
  return rows[0] ? rowToDoc(rows[0]) : null
}

export async function countDocs(orgId: string): Promise<number> {
  await initDB()
  const { rows } = await query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM studio_documents WHERE org_id = $1`,
    [orgId],
  )
  return Number(rows[0]?.n ?? 0)
}

/**
 * Create a new saved document. Enforces `limit` (the plan's cap) — throws
 * "doc limit reached" when the org is already at the cap.
 */
export async function createDoc(
  orgId: string,
  userId: string | null,
  name: string,
  doc: unknown,
  limit: number,
): Promise<StudioDoc> {
  if ((await countDocs(orgId)) >= limit) {
    throw new Error("doc limit reached")
  }
  const { rows } = await query<DocRow>(
    `INSERT INTO studio_documents (org_id, user_id, name, doc)
       VALUES ($1, $2, $3, $4::jsonb)
     RETURNING id, org_id, user_id, name, doc, updated_at`,
    [orgId, userId, name.slice(0, 200), JSON.stringify(doc)],
  )
  return rowToDoc(rows[0])
}

export async function updateDoc(
  orgId: string,
  id: number,
  name: string,
  doc: unknown,
): Promise<StudioDoc | null> {
  const { rows } = await query<DocRow>(
    `UPDATE studio_documents SET name = $3, doc = $4::jsonb, updated_at = NOW()
      WHERE id = $1 AND org_id = $2
     RETURNING id, org_id, user_id, name, doc, updated_at`,
    [id, orgId, name.slice(0, 200), JSON.stringify(doc)],
  )
  return rows[0] ? rowToDoc(rows[0]) : null
}

export async function deleteDoc(orgId: string, id: number): Promise<boolean> {
  const { rowCount } = await query(
    `DELETE FROM studio_documents WHERE id = $1 AND org_id = $2`,
    [id, orgId],
  )
  return (rowCount ?? 0) > 0
}
