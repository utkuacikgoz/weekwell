/**
 * Owner-scoped storage contract (A6). Every read and write is keyed by the
 * authenticated owner. In production this maps to Postgres row-level security
 * (`owner_id = auth.uid()`); this in-memory version enforces the same rule so
 * the contract is testable. Another user's row reads as "not found" so ids
 * cannot be probed.
 */
export class NotFoundError extends Error {
  constructor() {
    super('not_found');
    this.name = 'NotFoundError';
  }
}

export type Owned = { id: string; ownerId: string };

export class OwnerScopedStore<T extends Owned> {
  private readonly rows = new Map<string, T>();

  put(requesterId: string, row: T): void {
    if (row.ownerId !== requesterId) throw new NotFoundError();
    const existing = this.rows.get(row.id);
    if (existing && existing.ownerId !== requesterId) throw new NotFoundError();
    this.rows.set(row.id, row);
  }

  get(requesterId: string, id: string): T {
    const row = this.rows.get(id);
    if (!row || row.ownerId !== requesterId) throw new NotFoundError();
    return row;
  }

  list(requesterId: string): T[] {
    return [...this.rows.values()].filter((r) => r.ownerId === requesterId);
  }

  delete(requesterId: string, id: string): void {
    this.get(requesterId, id);
    this.rows.delete(id);
  }

  /** Account deletion: remove every row owned by this user. Returns the count removed. */
  deleteAllFor(ownerId: string): number {
    let n = 0;
    for (const [id, row] of this.rows) {
      if (row.ownerId === ownerId) {
        this.rows.delete(id);
        n++;
      }
    }
    return n;
  }
}
