import { NextRequest, NextResponse } from 'next/server';
import { getProducts, createProduct, ProductFilters } from '@/server/products';
import { createProductSchema } from '@/lib/validations/catalog';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const search = url.searchParams.get('search') || undefined;
    const categoryId = url.searchParams.get('categoryId') || undefined;
    const isArchivedParam = url.searchParams.get('isArchived');
    const isArchived = isArchivedParam !== null ? isArchivedParam === 'true' : undefined;
    const page = url.searchParams.get('page') ? parseInt(url.searchParams.get('page')!, 10) : 1;
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!, 10) : 10;
    const sortBy = (url.searchParams.get('sortBy') as ProductFilters['sortBy']) || 'createdAt';
    const sortOrder = (url.searchParams.get('sortOrder') as ProductFilters['sortOrder']) || 'desc';

    const result = await getProducts({
      search,
      categoryId,
      isArchived,
      page,
      limit,
      sortBy,
      sortOrder,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createProductSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const created = await createProduct(parsed.data);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
