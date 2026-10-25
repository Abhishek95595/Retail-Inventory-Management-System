import { NextRequest, NextResponse } from 'next/server';
import { getUsers, createUser } from '@/server/users';
import { createUserSchema } from '@/lib/validations/users';
import type { UserRole } from '@/lib/permissions';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const search = url.searchParams.get('search') || undefined;
    const roleParam = url.searchParams.get('role');
    const role = roleParam ? (roleParam as UserRole) : undefined;
    const isActiveParam = url.searchParams.get('isActive');
    const isActive = isActiveParam !== null ? isActiveParam === 'true' : undefined;

    const data = await getUsers({ search, role, isActive });
    return NextResponse.json({ success: true, data });
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
    const parsed = createUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const created = await createUser(parsed.data);
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
