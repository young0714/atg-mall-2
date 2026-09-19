/**
 * Shared helpers for treating Category's self-relation (parentId/children)
 * as an actual tree — used by both the admin categories screen (building a
 * nested display, prevent cycles) and the storefront (recursively include
 * child-category products when a parent category is selected).
 */

export interface FlatCategory {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  parentId: string | null;
}

export interface CategoryTreeNode extends FlatCategory {
  children: CategoryTreeNode[];
}

export function buildCategoryTree(flat: FlatCategory[]): CategoryTreeNode[] {
  const byId = new Map<string, CategoryTreeNode>(flat.map((c) => [c.id, { ...c, children: [] }]));
  const roots: CategoryTreeNode[] = [];
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

/** The category's own id plus every descendant's id — for "show products from this category and all its children" filtering. */
export function collectDescendantIds(flat: Pick<FlatCategory, "id" | "parentId">[], rootId: string): string[] {
  const childrenByParent = new Map<string, string[]>();
  for (const c of flat) {
    if (!c.parentId) continue;
    const list = childrenByParent.get(c.parentId) ?? [];
    list.push(c.id);
    childrenByParent.set(c.parentId, list);
  }

  const result = [rootId];
  const stack = [rootId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const childId of childrenByParent.get(current) ?? []) {
      result.push(childId);
      stack.push(childId);
    }
  }
  return result;
}

/** Would setting `categoryId`'s parent to `candidateParentId` make categoryId its own ancestor? */
export function wouldCreateCycle(
  flat: Pick<FlatCategory, "id" | "parentId">[],
  categoryId: string,
  candidateParentId: string,
): boolean {
  if (categoryId === candidateParentId) return true;
  const parentOf = new Map(flat.map((c) => [c.id, c.parentId]));
  const seen = new Set<string>();
  let current: string | null = candidateParentId;
  while (current) {
    if (current === categoryId) return true;
    if (seen.has(current)) break; // defensive — shouldn't happen with valid data
    seen.add(current);
    current = parentOf.get(current) ?? null;
  }
  return false;
}

/** activeId plus every one of its ancestors — for expanding a nav tree down to the selected category without showing everything. */
export function getActivePath(flat: Pick<FlatCategory, "id" | "parentId">[], activeId: string): Set<string> {
  const parentOf = new Map<string, string | null>(flat.map((c) => [c.id, c.parentId]));
  const path = new Set<string>([activeId]);
  let current: string | null = activeId;
  while (current) {
    const parentId: string | null = parentOf.get(current) ?? null;
    if (!parentId || path.has(parentId)) break;
    path.add(parentId);
    current = parentId;
  }
  return path;
}
