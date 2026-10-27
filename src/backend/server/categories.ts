import { db } from '@/backend/db';
import { categories, products } from '@/backend/db/schema';
import { eq, sql } from 'drizzle-orm';
import { requirePermission } from '@/backend/server/auth';
import { PERMISSIONS } from '@/shared/permissions';
import { createAuditLog } from '@/backend/server/audit';
import { CreateCategoryInput, UpdateCategoryInput } from '@/shared/validations/catalog';

export interface CategoryWithCount {
  id: string;
  name: string;
  code: string;
  description: string | null;
  parentId: string | null;
  parentName?: string | null;
  productCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Checks if targetParentId is a descendant of categoryId (preventing hierarchy cycles).
 */
export async function isDescendantCategory(
  categoryId: string,
  targetParentId: string
): Promise<boolean> {
  if (categoryId === targetParentId) {
    return true;
  }

  // Recursive CTE to find all descendants of categoryId
  const result = await db.execute(sql`
    WITH RECURSIVE category_tree AS (
      SELECT id, parent_id
      FROM categories
      WHERE parent_id = ${categoryId}::uuid
      UNION ALL
      SELECT c.id, c.parent_id
      FROM categories c
      INNER JOIN category_tree ct ON c.parent_id = ct.id
    )
    SELECT id FROM category_tree WHERE id = ${targetParentId}::uuid LIMIT 1;
  `);

  return result.length > 0;
}

/**
 * Get all categories with product count and parent name.
 */
export async function getCategories(): Promise<CategoryWithCount[]> {
  await requirePermission(PERMISSIONS.CATALOG_READ);

  const parentAlias = sql`p.name`;

  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      code: categories.code,
      description: categories.description,
      parentId: categories.parentId,
      parentName: parentAlias,
      productCount: sql<number>`cast(count(${products.id}) as int)`,
      createdAt: categories.createdAt,
      updatedAt: categories.updatedAt,
    })
    .from(categories)
    .leftJoin(sql`categories p`, sql`${categories.parentId} = p.id`)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .groupBy(categories.id, sql`p.name`)
    .orderBy(categories.name);

  return rows as unknown as CategoryWithCount[];
}

/**
 * Get a single category by ID.
 */
export async function getCategoryById(id: string) {
  await requirePermission(PERMISSIONS.CATALOG_READ);

  const [category] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);

  return category || null;
}

/**
 * Create a new category.
 */
export async function createCategory(input: CreateCategoryInput) {
  const actor = await requirePermission(PERMISSIONS.CATALOG_MANAGE);

  // Verify unique code
  const [existingCode] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.code, input.code))
    .limit(1);

  if (existingCode) {
    throw new Error('A category with this code already exists.');
  }

  // Verify parent exists if provided
  if (input.parentId) {
    const parent = await getCategoryById(input.parentId);
    if (!parent) {
      throw new Error('Selected parent category does not exist.');
    }
  }

  return await db.transaction(async (tx) => {
    const [newCategory] = await tx
      .insert(categories)
      .values({
        name: input.name,
        code: input.code,
        description: input.description || null,
        parentId: input.parentId || null,
      })
      .returning();

    await createAuditLog(
      {
        actorId: actor.id,
        action: 'CREATE',
        entityType: 'CATEGORY',
        entityId: newCategory.id,
        newValues: newCategory,
      },
      tx
    );

    return newCategory;
  });
}

/**
 * Update an existing category.
 */
export async function updateCategory(input: UpdateCategoryInput) {
  const actor = await requirePermission(PERMISSIONS.CATALOG_MANAGE);

  const existing = await getCategoryById(input.id);
  if (!existing) {
    throw new Error('Category not found.');
  }

  // Check code uniqueness if changing code
  if (input.code && input.code !== existing.code) {
    const [duplicate] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.code, input.code))
      .limit(1);

    if (duplicate) {
      throw new Error('A category with this code already exists.');
    }
  }

  // Validate parent hierarchy and prevent cycles
  if (input.parentId !== undefined && input.parentId !== null) {
    if (input.parentId === input.id) {
      throw new Error('A category cannot be its own parent.');
    }

    const isCycle = await isDescendantCategory(input.id, input.parentId);
    if (isCycle) {
      throw new Error(
        'Cannot assign a category as a child of one of its descendants (hierarchy cycle).'
      );
    }
  }

  return await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(categories)
      .set({
        name: input.name ?? existing.name,
        code: input.code ?? existing.code,
        description: input.description !== undefined ? input.description : existing.description,
        parentId: input.parentId !== undefined ? input.parentId : existing.parentId,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, input.id))
      .returning();

    await createAuditLog(
      {
        actorId: actor.id,
        action: 'UPDATE',
        entityType: 'CATEGORY',
        entityId: updated.id,
        oldValues: existing,
        newValues: updated,
      },
      tx
    );

    return updated;
  });
}

/**
 * Delete a category (restricted if referenced by products or child categories).
 */
export async function deleteCategory(id: string) {
  const actor = await requirePermission(PERMISSIONS.CATALOG_MANAGE);

  const existing = await getCategoryById(id);
  if (!existing) {
    throw new Error('Category not found.');
  }

  // Check if child categories exist
  const [child] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.parentId, id))
    .limit(1);

  if (child) {
    throw new Error(
      'Cannot delete category with active subcategories. Reassign or delete children first.'
    );
  }

  // Check if products exist in category
  const [prod] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.categoryId, id))
    .limit(1);

  if (prod) {
    throw new Error('Cannot delete category containing products. Reassign products first.');
  }

  return await db.transaction(async (tx) => {
    await tx.delete(categories).where(eq(categories.id, id));

    await createAuditLog(
      {
        actorId: actor.id,
        action: 'DELETE',
        entityType: 'CATEGORY',
        entityId: id,
        oldValues: existing,
      },
      tx
    );

    return { success: true };
  });
}
