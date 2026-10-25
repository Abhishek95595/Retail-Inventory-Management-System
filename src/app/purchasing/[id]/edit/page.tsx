import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { db } from '@/db';
import { warehouses, products, suppliers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { AppHeader } from '@/components/AppHeader';
import { PurchaseOrderForm } from '@/components/PurchaseOrderForm';
import { getPurchaseOrderById } from '@/server/purchasing';

interface EditPOPageProps {
  params: { id: string };
}

export default async function EditPurchaseOrderPage({ params }: EditPOPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }

  const [po, suppliersList, warehousesList, productsList] = await Promise.all([
    getPurchaseOrderById(params.id),
    db
      .select({ id: suppliers.id, name: suppliers.name, code: suppliers.code })
      .from(suppliers)
      .where(eq(suppliers.isActive, true))
      .orderBy(suppliers.name),
    db
      .select({ id: warehouses.id, name: warehouses.name, code: warehouses.code })
      .from(warehouses)
      .where(eq(warehouses.isActive, true))
      .orderBy(warehouses.name),
    db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        costPrice: products.costPrice,
        uom: products.uom,
      })
      .from(products)
      .where(eq(products.isArchived, false))
      .orderBy(products.name),
  ]);

  if (!po) {
    notFound();
  }

  if (po.status !== 'DRAFT') {
    redirect(`/purchasing/${params.id}`);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader user={session.user} />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Edit Draft Purchase Order
          </h1>
          <p className="text-sm text-slate-500">
            Update order lines, quantities, and supplier details for {po.poNumber}.
          </p>
        </div>

        <PurchaseOrderForm
          suppliers={suppliersList}
          warehouses={warehousesList}
          products={productsList}
          isEdit={true}
          initialData={{
            id: po.id,
            supplierId: po.supplierId,
            destinationWarehouseId: po.destinationWarehouseId,
            expectedArrivalDate: po.expectedArrivalDate,
            items: po.items.map((i) => ({
              productId: i.productId,
              quantityOrdered: i.quantityOrdered,
              unitCost: i.unitCost,
            })),
          }}
        />
      </main>
    </div>
  );
}
