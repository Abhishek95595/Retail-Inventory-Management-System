import { db } from '@/db';
import { products, categories, suppliers } from '@/db/schema';
import { eq, and, or, ilike, sql, desc, asc, SQL } from 'drizzle-orm';
import { requirePermission } from '@/server/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { createAuditLog } from '@/server/audit';
import { CreateProductInput, UpdateProductInput } from '@/lib/validations/catalog';

export interface ProductFilters {
  search?: string;
  categoryId?: string;
  isArchived?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'sku' | 'costPrice' | 'sellingPrice' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedProducts {
  items: Array<{
    id: string;
    sku: string;
    barcode: string | null;
    name: string;
    description: string | null;
    categoryId: string;
    categoryName: string;
    preferredSupplierId: string | null;
    supplierName: string | null;
    brand: string | null;
    uom: string;
    costPrice: string;
    sellingPrice: string;
    reorderPoint: string;
    reorderQuantity: string;
    imageUrl: string | null;
    isArchived: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Query products with pagination, search, category filter, and explicit allowlist sorting.
 */
export async function getProducts(filters: ProductFilters = {}): Promise<PaginatedProducts> {
  await requirePermission(PERMISSIONS.CATALOG_READ);

  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, Math.max(1, filters.limit || 10));
  const offset = (page - 1) * limit;

  // Build filter conditions
  const conditions: SQL[] = [];

  if (filters.search) {
    const term = `%${filters.search.trim()}%`;
    conditions.push(
      or(ilike(products.name, term), ilike(products.sku, term), ilike(products.barcode, term))!
    );
  }

  if (filters.categoryId) {
    conditions.push(eq(products.categoryId, filters.categoryId));
  }

  if (filters.isArchived !== undefined) {
    conditions.push(eq(products.isArchived, filters.isArchived));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Sorting allowlist
  let orderExpr = desc(products.createdAt);
  const direction = filters.sortOrder === 'asc' ? asc : desc;

  switch (filters.sortBy) {
    case 'name':
      orderExpr = direction(products.name);
      break;
    case 'sku':
      orderExpr = direction(products.sku);
      break;
    case 'costPrice':
      orderExpr = direction(products.costPrice);
      break;
    case 'sellingPrice':
      orderExpr = direction(products.sellingPrice);
      break;
    case 'createdAt':
    default:
      orderExpr = direction(products.createdAt);
      break;
  }

  // Count total matching items
  const [countResult] = await db
    .select({ total: sql<number>`cast(count(${products.id}) as int)` })
    .from(products)
    .where(whereClause);

  const total = countResult?.total || 0;

  // Query paginated items with joined category and supplier names
  const items = await db
    .select({
      id: products.id,
      sku: products.sku,
      barcode: products.barcode,
      name: products.name,
      description: products.description,
      categoryId: products.categoryId,
      categoryName: categories.name,
      preferredSupplierId: products.preferredSupplierId,
      supplierName: suppliers.name,
      brand: products.brand,
      uom: products.uom,
      costPrice: products.costPrice,
      sellingPrice: products.sellingPrice,
      reorderPoint: products.reorderPoint,
      reorderQuantity: products.reorderQuantity,
      imageUrl: products.imageUrl,
      isArchived: products.isArchived,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(suppliers, eq(products.preferredSupplierId, suppliers.id))
    .where(whereClause)
    .orderBy(orderExpr)
    .limit(limit)
    .offset(offset);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

/**
 * Get product by ID.
 */
export async function getProductById(id: string) {
  await requirePermission(PERMISSIONS.CATALOG_READ);

  const [product] = await db
    .select({
      id: products.id,
      sku: products.sku,
      barcode: products.barcode,
      name: products.name,
      description: products.description,
      categoryId: products.categoryId,
      categoryName: categories.name,
      preferredSupplierId: products.preferredSupplierId,
      supplierName: suppliers.name,
      brand: products.brand,
      uom: products.uom,
      costPrice: products.costPrice,
      sellingPrice: products.sellingPrice,
      reorderPoint: products.reorderPoint,
      reorderQuantity: products.reorderQuantity,
      imageUrl: products.imageUrl,
      isArchived: products.isArchived,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(suppliers, eq(products.preferredSupplierId, suppliers.id))
    .where(eq(products.id, id))
    .limit(1);

  return product || null;
}

/**
 * Create a new product with uniqueness checks, category validation, and audit logging.
 */
export async function createProduct(input: CreateProductInput) {
  const actor = await requirePermission(PERMISSIONS.CATALOG_MANAGE);

  // Validate SKU uniqueness
  const [existingSku] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.sku, input.sku))
    .limit(1);

  if (existingSku) {
    throw new Error('A product with this SKU already exists.');
  }

  // Validate Barcode uniqueness if barcode is provided
  if (input.barcode) {
    const [existingBarcode] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.barcode, input.barcode))
      .limit(1);

    if (existingBarcode) {
      throw new Error('A product with this barcode already exists.');
    }
  }

  // Validate Category exists
  const [category] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.id, input.categoryId))
    .limit(1);

  if (!category) {
    throw new Error('The selected category does not exist.');
  }

  // Validate Supplier exists if provided
  if (input.preferredSupplierId) {
    const [supplier] = await db
      .select({ id: suppliers.id })
      .from(suppliers)
      .where(eq(suppliers.id, input.preferredSupplierId))
      .limit(1);

    if (!supplier) {
      throw new Error('The selected preferred supplier does not exist.');
    }
  }

  return await db.transaction(async (tx) => {
    const costPriceStr = Number(input.costPrice ?? 0).toFixed(4);
    const sellingPriceStr = Number(input.sellingPrice ?? 0).toFixed(4);
    const reorderPointStr = Number(input.reorderPoint ?? 0).toFixed(2);
    const reorderQuantityStr = Number(input.reorderQuantity ?? 0).toFixed(2);

    const [newProduct] = await tx
      .insert(products)
      .values({
        sku: input.sku,
        barcode: input.barcode || null,
        name: input.name,
        description: input.description || null,
        categoryId: input.categoryId,
        preferredSupplierId: input.preferredSupplierId || null,
        brand: input.brand || null,
        uom: input.uom || 'EACH',
        costPrice: costPriceStr,
        sellingPrice: sellingPriceStr,
        reorderPoint: reorderPointStr,
        reorderQuantity: reorderQuantityStr,
        imageUrl: input.imageUrl || null,
        isArchived: false,
      })
      .returning();

    await createAuditLog(
      {
        actorId: actor.id,
        action: 'CREATE',
        entityType: 'PRODUCT',
        entityId: newProduct.id,
        newValues: newProduct,
      },
      tx
    );

    return newProduct;
  });
}

/**
 * Update an existing product.
 */
export async function updateProduct(input: UpdateProductInput) {
  const actor = await requirePermission(PERMISSIONS.CATALOG_MANAGE);

  const existing = await getProductById(input.id);
  if (!existing) {
    throw new Error('Product not found.');
  }

  // SKU uniqueness check if changed
  if (input.sku && input.sku !== existing.sku) {
    const [duplicateSku] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.sku, input.sku))
      .limit(1);

    if (duplicateSku) {
      throw new Error('A product with this SKU already exists.');
    }
  }

  // Barcode uniqueness check if changed
  if (input.barcode && input.barcode !== existing.barcode) {
    const [duplicateBarcode] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.barcode, input.barcode))
      .limit(1);

    if (duplicateBarcode) {
      throw new Error('A product with this barcode already exists.');
    }
  }

  // Category validation if changed
  if (input.categoryId && input.categoryId !== existing.categoryId) {
    const [cat] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, input.categoryId))
      .limit(1);

    if (!cat) {
      throw new Error('The selected category does not exist.');
    }
  }

  return await db.transaction(async (tx) => {
    const costPriceStr =
      input.costPrice !== undefined ? Number(input.costPrice).toFixed(4) : existing.costPrice;
    const sellingPriceStr =
      input.sellingPrice !== undefined
        ? Number(input.sellingPrice).toFixed(4)
        : existing.sellingPrice;
    const reorderPointStr =
      input.reorderPoint !== undefined
        ? Number(input.reorderPoint).toFixed(2)
        : existing.reorderPoint;
    const reorderQuantityStr =
      input.reorderQuantity !== undefined
        ? Number(input.reorderQuantity).toFixed(2)
        : existing.reorderQuantity;

    const [updated] = await tx
      .update(products)
      .set({
        sku: input.sku ?? existing.sku,
        barcode: input.barcode !== undefined ? input.barcode : existing.barcode,
        name: input.name ?? existing.name,
        description: input.description !== undefined ? input.description : existing.description,
        categoryId: input.categoryId ?? existing.categoryId,
        preferredSupplierId:
          input.preferredSupplierId !== undefined
            ? input.preferredSupplierId
            : existing.preferredSupplierId,
        brand: input.brand !== undefined ? input.brand : existing.brand,
        uom: input.uom ?? existing.uom,
        costPrice: costPriceStr,
        sellingPrice: sellingPriceStr,
        reorderPoint: reorderPointStr,
        reorderQuantity: reorderQuantityStr,
        imageUrl: input.imageUrl !== undefined ? input.imageUrl : existing.imageUrl,
        isArchived: input.isArchived !== undefined ? input.isArchived : existing.isArchived,
        updatedAt: new Date(),
      })
      .where(eq(products.id, input.id))
      .returning();

    await createAuditLog(
      {
        actorId: actor.id,
        action: 'UPDATE',
        entityType: 'PRODUCT',
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
 * Archive a product (soft delete ensuring historical transactions are preserved).
 */
export async function archiveProduct(id: string, isArchived: boolean = true) {
  const actor = await requirePermission(PERMISSIONS.CATALOG_MANAGE);

  const existing = await getProductById(id);
  if (!existing) {
    throw new Error('Product not found.');
  }

  return await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(products)
      .set({
        isArchived,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning();

    await createAuditLog(
      {
        actorId: actor.id,
        action: isArchived ? 'ARCHIVE' : 'UNARCHIVE',
        entityType: 'PRODUCT',
        entityId: id,
        oldValues: { isArchived: existing.isArchived },
        newValues: { isArchived },
      },
      tx
    );

    return updated;
  });
}
