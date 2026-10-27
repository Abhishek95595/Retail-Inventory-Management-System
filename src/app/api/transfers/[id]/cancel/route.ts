import { NextRequest, NextResponse } from 'next/server';
import { cancelTransfer } from '@/backend/server/transfers';
import { cancelTransferSchema } from '@/shared/validations/transfer';

interface RouteContext {
  params: { id: string };
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    let body = {};
    try {
      body = await req.json();
    } catch {
      // Empty body is acceptable
    }

    const parsed = cancelTransferSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const result = await cancelTransfer(params.id, parsed.data);
    return NextResponse.json({ success: true, data: result });
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
