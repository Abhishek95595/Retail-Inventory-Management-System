import { NextRequest, NextResponse } from 'next/server';
import { recordStockReceipt } from '@/backend/server/movements';
import { stockReceiptSchema } from '@/shared/validations/movement';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = stockReceiptSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const result = await recordStockReceipt(parsed.data);
    return NextResponse.json({ success: true, data: result }, { status: 201 });
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
