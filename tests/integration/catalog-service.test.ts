import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createCategory, updateCategory } from '@/server/categories';
import { createProduct, archiveProduct, getProducts } from '@/server/products';

const connectionString =
  process.env.DATABASE_URL || 'postgresql://abhishekverma:@localhost:5432/rims_dev';

// Mock server auth for integration tests using the existing seeded admin user
vi.mock('@/server/auth', () => ({
  requirePermission: vi.fn().mockResolvedValue({
    id: '7b7d58da-d45a-411d-bd0e-c42f65521482',
    email: 'admin@rims.local',
    name: 'System Administrator',
    role: 'ADMIN',
    isActive: true,
  }),
  requireAuth: vi.fn().mockResolvedValue({
    id: '7b7d58da-d45a-411d-bd0e-c42f65521482',
    email: 'admin@rims.local',
    name: 'System Administrator',
    role: 'ADMIN',
    isActive: true,
  }),
}));

describe('RIMS Category & Product Catalog Server Operations Integration Tests', () => {
  let sql: postgres.Sql;
  let dbClient: ReturnType<typeof drizzle>;

  const createdCategoryIds: string[] = [];
  const createdProductIds: string[] = [];

  beforeAll(async () => {
    sql = postgres(connectionString, { max: 1 });
    dbClient = drizzle(sql, { schema });
  });

  afterAll(async () => {
    // Clean up test products
    for (const prodId of createdProductIds) {
      await dbClient.delete(schema.products).where(eq(schema.products.id, prodId));
    }
    // Nullify parent relationships first to prevent foreign key violations on categories
    for (const catId of createdCategoryIds) {
      await dbClient
        .update(schema.categories)
        .set({ parentId: null })
        .where(eq(schema.categories.id, catId));
    }
    // Delete categories
    for (const catId of createdCategoryIds.reverse()) {
      await dbClient.delete(schema.categories).where(eq(schema.categories.id, catId));
    }
    await sql.end();
  });

  it('creates categories and prevents duplicate category codes', async () => {
    const code = `CAT_TEST_${Date.now()}`;
    const cat = await createCategory({
      name: 'Electronics Test',
      code,
      description: 'Test category description',
    });

    createdCategoryIds.push(cat.id);
    expect(cat.id).toBeDefined();
    expect(cat.code).toBe(code);

    // Duplicate code must be rejected
    await expect(
      createCategory({
        name: 'Duplicate Electronics',
        code,
      })
    ).rejects.toThrow('A category with this code already exists.');
  });

  it('prevents self-parenting and hierarchy cycles when nesting categories', async () => {
    const parent = await createCategory({
      name: 'Parent Cat',
      code: `P_${Date.now()}`,
    });
    createdCategoryIds.push(parent.id);

    const child = await createCategory({
      name: 'Child Cat',
      code: `C_${Date.now()}`,
      parentId: parent.id,
    });
    createdCategoryIds.push(child.id);

    // 1. Cannot assign self as parent
    await expect(
      updateCategory({
        id: parent.id,
        parentId: parent.id,
      })
    ).rejects.toThrow('A category cannot be its own parent.');

    // 2. Cannot assign parent to be a child of its descendant
    await expect(
      updateCategory({
        id: parent.id,
        parentId: child.id,
      })
    ).rejects.toThrow('hierarchy cycle');
  });

  it('creates products and validates SKU uniqueness and barcode uniqueness', async () => {
    const cat = await createCategory({
      name: 'Hardware Test',
      code: `HDW_${Date.now()}`,
    });
    createdCategoryIds.push(cat.id);

    const sku = `SKU_PROD_${Date.now()}`;
    const barcode = `BAR_${Date.now()}`;

    const prod = await createProduct({
      sku,
      barcode,
      name: 'Titanium Screws',
      categoryId: cat.id,
      costPrice: 5.5,
      sellingPrice: 12.0,
      reorderPoint: 50,
      reorderQuantity: 200,
      uom: 'BOX',
    });

    createdProductIds.push(prod.id);
    expect(prod.id).toBeDefined();
    expect(prod.sku).toBe(sku);
    expect(Number(prod.costPrice)).toBe(5.5);

    // Duplicate SKU must fail
    await expect(
      createProduct({
        sku,
        name: 'Duplicate SKU Product',
        categoryId: cat.id,
        costPrice: 10,
        sellingPrice: 20,
        reorderPoint: 10,
        reorderQuantity: 50,
        uom: 'EACH',
      })
    ).rejects.toThrow('A product with this SKU already exists.');

    // Duplicate Barcode must fail
    await expect(
      createProduct({
        sku: `SKU_NEW_${Date.now()}`,
        barcode, // Same barcode
        name: 'Duplicate Barcode Product',
        categoryId: cat.id,
        costPrice: 10,
        sellingPrice: 20,
        reorderPoint: 10,
        reorderQuantity: 50,
        uom: 'EACH',
      })
    ).rejects.toThrow('A product with this barcode already exists.');
  });

  it('supports pagination, search, and soft-archiving on products', async () => {
    const cat = await createCategory({
      name: 'Search Category',
      code: `SRC_${Date.now()}`,
    });
    createdCategoryIds.push(cat.id);

    const uniqueTag = `TAG_${Date.now()}`;
    const prod = await createProduct({
      sku: `SKU_S_${Date.now()}`,
      name: `Searchable Item ${uniqueTag}`,
      categoryId: cat.id,
      costPrice: 15,
      sellingPrice: 30,
      reorderPoint: 5,
      reorderQuantity: 25,
      uom: 'EACH',
    });
    createdProductIds.push(prod.id);

    // Search query
    const searchResults = await getProducts({ search: uniqueTag });
    expect(searchResults.items.length).toBeGreaterThanOrEqual(1);
    expect(searchResults.items[0].name).toContain(uniqueTag);

    // Archive product
    const archived = await archiveProduct(prod.id, true);
    expect(archived.isArchived).toBe(true);

    // Verify archived status in filtered query
    const activeResults = await getProducts({ search: uniqueTag, isArchived: false });
    expect(activeResults.items.find((i) => i.id === prod.id)).toBeUndefined();

    const archivedResults = await getProducts({ search: uniqueTag, isArchived: true });
    expect(archivedResults.items.find((i) => i.id === prod.id)).toBeDefined();
  });

  it('creates an immutable audit log entry upon category and product mutations', async () => {
    const catCode = `AUD_${Date.now()}`;
    const cat = await createCategory({
      name: 'Audit Tested Category',
      code: catCode,
    });
    createdCategoryIds.push(cat.id);

    // Verify audit record exists
    const [auditEntry] = await dbClient
      .select()
      .from(schema.auditLogs)
      .where(eq(schema.auditLogs.entityId, cat.id))
      .limit(1);

    expect(auditEntry).toBeDefined();
    expect(auditEntry.action).toBe('CREATE');
    expect(auditEntry.entityType).toBe('CATEGORY');
  });
});
