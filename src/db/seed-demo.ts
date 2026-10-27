import postgres from 'postgres';
import * as dotenv from 'dotenv';
import { hashPassword } from '../lib/password';

dotenv.config({ path: '.env.local' });
dotenv.config();

const connectionString =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres_dev_password@localhost:5432/rims_dev';

/**
 * Validate that the target database is explicitly a development or demo database.
 * Refuses execution if running in production, if database URL points to a production host,
 * or if the database name is not an authorized development/demo DB.
 */
function validateDatabaseTarget(urlStr: string) {
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_PROD_SEED) {
    throw new Error(
      '⛔ FATAL: seed-demo cannot be executed in production environment without explicit ALLOW_PROD_SEED=true.'
    );
  }

  // Parse target database name
  try {
    const parsed = new URL(urlStr);
    const dbName = parsed.pathname.replace(/^\//, '');

    const allowedDbNames = ['rims_dev', 'rims_demo', 'rims_staging', 'rims_test'];
    const isLocalhost =
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === '0.0.0.0';

    if (!isLocalhost && !process.env.ALLOW_REMOTE_SEED) {
      throw new Error(
        `⛔ FATAL: Refusing to seed non-localhost database (${parsed.hostname}) without ALLOW_REMOTE_SEED=true.`
      );
    }

    if (!allowedDbNames.includes(dbName) && !process.env.ALLOW_ANY_DB_NAME) {
      throw new Error(
        `⛔ FATAL: Target database "${dbName}" is not in the allowed list [${allowedDbNames.join(', ')}].`
      );
    }
  } catch (err: any) {
    if (err.message.startsWith('⛔ FATAL:')) throw err;
    throw new Error(`Invalid DATABASE_URL configuration: ${err.message}`);
  }
}

export async function runDemoSeed(options: { cleanTestFixtures?: boolean } = {}) {
  const { cleanTestFixtures = true } = options;

  validateDatabaseTarget(connectionString);

  console.log('🌱 Connecting to database for demonstration catalog setup...');
  const sql = postgres(connectionString, { max: 1 });

  try {
    await sql.begin(async (tx) => {
      console.log('🔒 Database safety verified. Running in transaction.');

      // 1. Ensure System Administrator exists
      const adminEmail = process.env.DEV_ADMIN_EMAIL || 'admin@rims.local';
      const adminPassword = process.env.DEV_ADMIN_PASSWORD || 'AdminPassword123!';

      let [adminUser] =
        await tx`SELECT id, email FROM users WHERE email = ${adminEmail.toLowerCase()};`;
      if (!adminUser) {
        console.log('👤 Creating default demo administrator...');
        const passwordHash = await hashPassword(adminPassword);
        [adminUser] = await tx`
          INSERT INTO users (email, password_hash, first_name, last_name, role, is_active)
          VALUES (${adminEmail.toLowerCase()}, ${passwordHash}, 'System', 'Administrator', 'ADMIN', true)
          RETURNING id, email;
        `;
      }
      const adminId = adminUser.id;

      // 2. Safe cleanup of disposable automated test fixtures (if confirmed)
      if (cleanTestFixtures) {
        console.log('🧹 Safely removing leftover ephemeral automated test fixtures...');

        // Delete goods receipt items & receipts linked to test POs
        await tx`
          DELETE FROM goods_receipt_items WHERE goods_receipt_id IN (
            SELECT gr.id FROM goods_receipts gr
            JOIN purchase_orders po ON gr.purchase_order_id = po.id
            WHERE po.po_number LIKE 'PO-%'
          );
        `;
        await tx`
          DELETE FROM goods_receipts WHERE purchase_order_id IN (
            SELECT id FROM purchase_orders WHERE po_number LIKE 'PO-%'
          );
        `;

        // Delete purchase order items & purchase orders
        await tx`DELETE FROM purchase_order_items WHERE purchase_order_id IN (SELECT id FROM purchase_orders WHERE po_number LIKE 'PO-%');`;
        await tx`DELETE FROM purchase_orders WHERE po_number LIKE 'PO-%';`;

        // Delete stock reservations & sales order items & sales orders
        await tx`DELETE FROM stock_reservations WHERE sales_order_id IN (SELECT id FROM sales_orders WHERE order_number LIKE 'SO-%');`;
        await tx`DELETE FROM sales_order_items WHERE sales_order_id IN (SELECT id FROM sales_orders WHERE order_number LIKE 'SO-%');`;
        await tx`DELETE FROM sales_orders WHERE order_number LIKE 'SO-%';`;

        // Delete stock transfer items & stock transfers
        await tx`DELETE FROM stock_transfer_items WHERE stock_transfer_id IN (SELECT id FROM stock_transfers WHERE transfer_number LIKE 'TR%');`;
        await tx`DELETE FROM stock_transfers WHERE transfer_number LIKE 'TR%';`;

        // Delete inventory movements & balances linked to test products
        await tx`DELETE FROM inventory_movements WHERE product_id IN (SELECT id FROM products WHERE sku LIKE 'SKU-E2E-%');`;
        await tx`DELETE FROM inventory_balances WHERE product_id IN (SELECT id FROM products WHERE sku LIKE 'SKU-E2E-%');`;

        // Delete test products
        await tx`DELETE FROM products WHERE sku LIKE 'SKU-E2E-%';`;

        // Delete test warehouses
        await tx`DELETE FROM inventory_movements WHERE warehouse_id IN (SELECT id FROM warehouses WHERE code LIKE 'WH_E2E_%' OR code LIKE 'DUP_E2E_%' OR code LIKE 'WH-REP-%');`;
        await tx`DELETE FROM inventory_balances WHERE warehouse_id IN (SELECT id FROM warehouses WHERE code LIKE 'WH_E2E_%' OR code LIKE 'DUP_E2E_%' OR code LIKE 'WH-REP-%');`;
        await tx`DELETE FROM warehouses WHERE code LIKE 'WH_E2E_%' OR code LIKE 'DUP_E2E_%' OR code LIKE 'WH-REP-%';`;

        // Delete test categories
        await tx`DELETE FROM categories WHERE code LIKE 'E2E_CAT_%' OR code = 'ELEC_DUP' OR code LIKE 'P_179%' OR code LIKE 'C_179%' OR code LIKE 'HDW_179%' OR code LIKE 'SRC_179%' OR code LIKE 'AUD_179%';`;
      }

      // 3. Seed Professional Categories (Idempotent upsert by code)
      console.log('📂 Seeding 5 professional retail categories...');
      const demoCategories = [
        {
          code: 'CAT-ELEC',
          name: 'Consumer Electronics',
          description: 'High-performance audio, visual devices, and consumer tech gear',
        },
        {
          code: 'CAT-FURN',
          name: 'Office Furniture',
          description: 'Ergonomic seating, standing desks, and modular workplace fixtures',
        },
        {
          code: 'CAT-COMP',
          name: 'Computer Accessories',
          description: 'Keyboards, precision mice, monitors, and workplace computing peripherals',
        },
        {
          code: 'CAT-MOBL',
          name: 'Mobile Accessories',
          description: 'Power banks, fast-chargers, cables, and mobile productivity devices',
        },
        {
          code: 'CAT-INDT',
          name: 'Industrial Tools',
          description: 'Measurement instruments, testing equipment, and precision utility tools',
        },
      ];

      const categoryMap = new Map<string, string>();
      for (const cat of demoCategories) {
        const [saved] = await tx`
          INSERT INTO categories (code, name, description)
          VALUES (${cat.code}, ${cat.name}, ${cat.description})
          ON CONFLICT (code) DO UPDATE
          SET name = EXCLUDED.name, description = EXCLUDED.description
          RETURNING id, code;
        `;
        categoryMap.set(saved.code, saved.id);
      }

      // 4. Seed Verified Suppliers (Idempotent upsert by code)
      console.log('🏢 Seeding verified vendors & suppliers...');
      const demoSuppliers = [
        {
          code: 'SUP-IND-01',
          name: 'Bharat Electro-Tech Solutions Ltd.',
          contactPerson: 'Rajesh Sharma',
          email: 'procurement@bharatelectro.in',
          phone: '+91 22 2850 4400',
          address: 'Plot 45, MIDC Industrial Area, Andheri East, Mumbai, MH 400093',
        },
        {
          code: 'SUP-IND-02',
          name: 'Vanguard Industrial Supplies Pvt. Ltd.',
          contactPerson: 'Priya Narayanan',
          email: 'orders@vanguardindustries.co.in',
          phone: '+91 80 4120 7788',
          address: 'Peenya Industrial Estate, Phase 2, Bengaluru, KA 560058',
        },
      ];

      const supplierMap = new Map<string, string>();
      for (const sup of demoSuppliers) {
        const [saved] = await tx`
          INSERT INTO suppliers (code, name, contact_person, email, phone, address, is_active)
          VALUES (${sup.code}, ${sup.name}, ${sup.contactPerson}, ${sup.email}, ${sup.phone}, ${sup.address}, true)
          ON CONFLICT (code) DO UPDATE
          SET name = EXCLUDED.name, contact_person = EXCLUDED.contact_person, email = EXCLUDED.email, phone = EXCLUDED.phone
          RETURNING id, code;
        `;
        supplierMap.set(saved.code, saved.id);
      }

      // 5. Seed 3 Strategic Warehouses (Idempotent upsert by code)
      console.log('🏭 Seeding 3 strategic regional fulfillment centers...');
      const demoWarehouses = [
        {
          code: 'WH-MUM-01',
          name: 'Mumbai Central Distribution Hub',
          address: 'Bhiwandi Logistics Park, Sector 4, Thane, Mumbai, MH 421302',
          contactPhone: '+91 22 6123 9001',
        },
        {
          code: 'WH-BLR-01',
          name: 'Bengaluru Fulfillment Center',
          address: 'Electronic City Phase 1, Hosur Road, Bengaluru, KA 560100',
          contactPhone: '+91 80 6789 1234',
        },
        {
          code: 'WH-DEL-01',
          name: 'Delhi NCR Logistics Depot',
          address: 'Udyog Vihar Phase 4, Gurugram, Haryana 122015',
          contactPhone: '+91 124 456 7890',
        },
      ];

      const warehouseMap = new Map<string, string>();
      for (const wh of demoWarehouses) {
        const [saved] = await tx`
          INSERT INTO warehouses (code, name, address, contact_phone, is_active)
          VALUES (${wh.code}, ${wh.name}, ${wh.address}, ${wh.contactPhone}, true)
          ON CONFLICT (code) DO UPDATE
          SET name = EXCLUDED.name, address = EXCLUDED.address, contact_phone = EXCLUDED.contact_phone, is_active = true
          RETURNING id, code;
        `;
        warehouseMap.set(saved.code, saved.id);
      }

      // 6. Seed 12 Professional Retail Products with realistic INR pricing (Idempotent upsert by SKU)
      console.log('📦 Seeding 12 curated retail products with realistic INR pricing...');
      const demoProducts = [
        {
          sku: 'SKU-ELEC-NC-001',
          barcode: '890102030401',
          name: 'Premium Wireless Noise-Cancelling Headphones',
          description:
            'Over-ear active noise-cancelling Bluetooth 5.3 headphones with 40h battery life and spatial audio.',
          categoryCode: 'CAT-ELEC',
          supplierCode: 'SUP-IND-01',
          brand: 'SoundAura',
          uom: 'EACH',
          costPrice: '4500.0000',
          sellingPrice: '8999.0000',
          reorderPoint: '15.00',
          reorderQuantity: '50.00',
        },
        {
          sku: 'SKU-FURN-CHR-002',
          barcode: '890102030402',
          name: 'Ergonomic Office Executive Chair',
          description:
            'High-back mesh executive chair with dynamic lumbar support, 3D armrests, and synchro-tilt mechanism.',
          categoryCode: 'CAT-FURN',
          supplierCode: 'SUP-IND-02',
          brand: 'ErgoComfort',
          uom: 'EACH',
          costPrice: '7200.0000',
          sellingPrice: '12499.0000',
          reorderPoint: '8.00',
          reorderQuantity: '25.00',
        },
        {
          sku: 'SKU-COMP-MON-003',
          barcode: '890102030403',
          name: 'Smart 4K Ultra-HD LED Monitor, 27-inch',
          description:
            '27-inch IPS UHD display with 99% sRGB, USB-C 65W power delivery hub, HDR400, and bezel-less design.',
          categoryCode: 'CAT-COMP',
          supplierCode: 'SUP-IND-01',
          brand: 'VisionPro',
          uom: 'EACH',
          costPrice: '16500.0000',
          sellingPrice: '24999.0000',
          reorderPoint: '10.00',
          reorderQuantity: '30.00',
        },
        {
          sku: 'SKU-MOBL-PB-004',
          barcode: '890102030404',
          name: 'Fast-Charging USB-C Power Bank, 20,000 mAh',
          description:
            '65W Power Delivery compact power bank with digital LED battery percentage indicator and triple output.',
          categoryCode: 'CAT-MOBL',
          supplierCode: 'SUP-IND-01',
          brand: 'PowerPulse',
          uom: 'EACH',
          costPrice: '1100.0000',
          sellingPrice: '1999.0000',
          reorderPoint: '25.00',
          reorderQuantity: '100.00',
        },
        {
          sku: 'SKU-COMP-KB-005',
          barcode: '890102030405',
          name: 'Mechanical RGB Gaming Keyboard',
          description:
            'Hot-swappable mechanical keyboard with custom red linear switches, per-key RGB backlighting, and volume roller.',
          categoryCode: 'CAT-COMP',
          supplierCode: 'SUP-IND-01',
          brand: 'KeyForge',
          uom: 'EACH',
          costPrice: '2400.0000',
          sellingPrice: '4299.0000',
          reorderPoint: '12.00',
          reorderQuantity: '40.00',
        },
        {
          sku: 'SKU-ELEC-SPK-006',
          barcode: '890102030406',
          name: 'Portable Waterproof Bluetooth Speaker (30W)',
          description:
            'IPX7 waterproof outdoor Bluetooth speaker with dual passive radiators, 24h playback, and PartyBoost pairing.',
          categoryCode: 'CAT-ELEC',
          supplierCode: 'SUP-IND-01',
          brand: 'SoundAura',
          uom: 'EACH',
          costPrice: '1850.0000',
          sellingPrice: '3499.0000',
          reorderPoint: '20.00',
          reorderQuantity: '60.00',
        },
        {
          sku: 'SKU-FURN-DSK-007',
          barcode: '890102030407',
          name: 'Dual-Motor Electric Standing Desk (140x70cm)',
          description:
            'Height-adjustable motorized sit-stand workstation with memory presets, anti-collision sensor, and cable management tray.',
          categoryCode: 'CAT-FURN',
          supplierCode: 'SUP-IND-02',
          brand: 'ErgoComfort',
          uom: 'EACH',
          costPrice: '14200.0000',
          sellingPrice: '21999.0000',
          reorderPoint: '5.00',
          reorderQuantity: '15.00',
        },
        {
          sku: 'SKU-COMP-MOU-008',
          barcode: '890102030408',
          name: 'Wireless Ergonomic Precision Mouse',
          description:
            'Rechargeable wireless ergonomic mouse with hyper-fast scroll wheel, thumb gestures, and multi-device Bluetooth sync.',
          categoryCode: 'CAT-COMP',
          supplierCode: 'SUP-IND-01',
          brand: 'KeyForge',
          uom: 'EACH',
          costPrice: '1350.0000',
          sellingPrice: '2499.0000',
          reorderPoint: '15.00',
          reorderQuantity: '50.00',
        },
        {
          sku: 'SKU-MOBL-CHG-009',
          barcode: '890102030409',
          name: '65W GaN Fast Wall Charger (Dual USB-C + USB-A)',
          description:
            'Gallium Nitride ultra-compact fast charger supporting PD 3.0 and PPS protocols for laptops, tablets, and phones.',
          categoryCode: 'CAT-MOBL',
          supplierCode: 'SUP-IND-01',
          brand: 'PowerPulse',
          uom: 'EACH',
          costPrice: '850.0000',
          sellingPrice: '1499.0000',
          reorderPoint: '30.00',
          reorderQuantity: '100.00',
        },
        {
          sku: 'SKU-INDT-CAL-010',
          barcode: '890102030410',
          name: 'Digital Precision Vernier Caliper (150mm)',
          description:
            'Stainless steel electronic vernier caliper with large LCD screen, metric/inch conversion, and 0.01mm resolution.',
          categoryCode: 'CAT-INDT',
          supplierCode: 'SUP-IND-02',
          brand: 'Vanguard Instruments',
          uom: 'EACH',
          costPrice: '950.0000',
          sellingPrice: '1899.0000',
          reorderPoint: '10.00',
          reorderQuantity: '30.00',
        },
        {
          sku: 'SKU-INDT-DMM-011',
          barcode: '890102030411',
          name: 'True-RMS Digital Multimeter (Auto-Ranging)',
          description:
            'Professional industrial electrical tester measuring AC/DC voltage, current, resistance, capacitance, and temperature.',
          categoryCode: 'CAT-INDT',
          supplierCode: 'SUP-IND-02',
          brand: 'Vanguard Instruments',
          uom: 'EACH',
          costPrice: '2100.0000',
          sellingPrice: '3899.0000',
          reorderPoint: '10.00',
          reorderQuantity: '25.00',
        },
        {
          sku: 'SKU-INDT-LTM-012',
          barcode: '890102030412',
          name: 'Laser Distance Measure Tape (60 Meters)',
          description:
            'High-precision handheld laser rangefinder with Pythagorean area/volume calculation and backlit LCD.',
          categoryCode: 'CAT-INDT',
          supplierCode: 'SUP-IND-02',
          brand: 'Vanguard Instruments',
          uom: 'EACH',
          costPrice: '1450.0000',
          sellingPrice: '2699.0000',
          reorderPoint: '12.00',
          reorderQuantity: '40.00',
        },
      ];

      const productMap = new Map<string, any>();
      for (const prod of demoProducts) {
        const categoryId = categoryMap.get(prod.categoryCode)!;
        const preferredSupplierId = supplierMap.get(prod.supplierCode) || null;

        const [saved] = await tx`
          INSERT INTO products (
            sku, barcode, name, description, category_id, preferred_supplier_id,
            brand, uom, cost_price, selling_price, reorder_point, reorder_quantity, is_archived
          )
          VALUES (
            ${prod.sku}, ${prod.barcode}, ${prod.name}, ${prod.description}, ${categoryId}, ${preferredSupplierId},
            ${prod.brand}, ${prod.uom}, ${prod.costPrice}, ${prod.sellingPrice}, ${prod.reorderPoint}, ${prod.reorderQuantity}, false
          )
          ON CONFLICT (sku) DO UPDATE
          SET name = EXCLUDED.name, description = EXCLUDED.description,
              cost_price = EXCLUDED.cost_price, selling_price = EXCLUDED.selling_price,
              reorder_point = EXCLUDED.reorder_point, reorder_quantity = EXCLUDED.reorder_quantity,
              category_id = EXCLUDED.category_id, preferred_supplier_id = EXCLUDED.preferred_supplier_id,
              is_archived = false
          RETURNING id, sku, cost_price, selling_price;
        `;
        productMap.set(saved.sku, saved);
      }

      // 7. Establish Verified Inventory Balances & Movement Ledgers across all 3 Warehouses
      console.log('⚖️ Establishing realistic inventory stock balances and movement ledger...');
      const whMumId = warehouseMap.get('WH-MUM-01')!;
      const whBlrId = warehouseMap.get('WH-BLR-01')!;
      const whDelId = warehouseMap.get('WH-DEL-01')!;

      // Realistic stock level configurations:
      // Mix of Healthy Stock, Low Stock (at/below reorder), and Out-of-Stock for demonstration
      const stockAllocations = [
        // Product 1: Noise Cancelling Headphones (Reorder: 15)
        { sku: 'SKU-ELEC-NC-001', whId: whMumId, onHand: 45, reserved: 3 }, // Healthy (Available: 42)
        { sku: 'SKU-ELEC-NC-001', whId: whBlrId, onHand: 12, reserved: 0 }, // Low Stock (12 <= 15)
        { sku: 'SKU-ELEC-NC-001', whId: whDelId, onHand: 28, reserved: 0 }, // Healthy (28)

        // Product 2: Executive Chair (Reorder: 8)
        { sku: 'SKU-FURN-CHR-002', whId: whMumId, onHand: 20, reserved: 2 }, // Healthy (18)
        { sku: 'SKU-FURN-CHR-002', whId: whBlrId, onHand: 6, reserved: 0 }, // Low Stock (6 <= 8)
        { sku: 'SKU-FURN-CHR-002', whId: whDelId, onHand: 14, reserved: 0 }, // Healthy (14)

        // Product 3: 4K Monitor (Reorder: 10)
        { sku: 'SKU-COMP-MON-003', whId: whMumId, onHand: 35, reserved: 5 }, // Healthy (30)
        { sku: 'SKU-COMP-MON-003', whId: whBlrId, onHand: 18, reserved: 0 }, // Healthy (18)
        { sku: 'SKU-COMP-MON-003', whId: whDelId, onHand: 0, reserved: 0 }, // Out of Stock (0)

        // Product 4: Fast-Charging Power Bank (Reorder: 25)
        { sku: 'SKU-MOBL-PB-004', whId: whMumId, onHand: 110, reserved: 10 }, // Healthy (100)
        { sku: 'SKU-MOBL-PB-004', whId: whBlrId, onHand: 85, reserved: 0 }, // Healthy (85)
        { sku: 'SKU-MOBL-PB-004', whId: whDelId, onHand: 20, reserved: 0 }, // Low Stock (20 <= 25)

        // Product 5: Mechanical Gaming Keyboard (Reorder: 12)
        { sku: 'SKU-COMP-KB-005', whId: whMumId, onHand: 50, reserved: 4 }, // Healthy (46)
        { sku: 'SKU-COMP-KB-005', whId: whBlrId, onHand: 30, reserved: 0 }, // Healthy (30)
        { sku: 'SKU-COMP-KB-005', whId: whDelId, onHand: 10, reserved: 0 }, // Low Stock (10 <= 12)

        // Product 6: Bluetooth Speaker (Reorder: 20)
        { sku: 'SKU-ELEC-SPK-006', whId: whMumId, onHand: 60, reserved: 0 }, // Healthy (60)
        { sku: 'SKU-ELEC-SPK-006', whId: whBlrId, onHand: 40, reserved: 0 }, // Healthy (40)
        { sku: 'SKU-ELEC-SPK-006', whId: whDelId, onHand: 25, reserved: 0 }, // Healthy (25)

        // Product 7: Standing Desk (Reorder: 5)
        { sku: 'SKU-FURN-DSK-007', whId: whMumId, onHand: 15, reserved: 1 }, // Healthy (14)
        { sku: 'SKU-FURN-DSK-007', whId: whBlrId, onHand: 8, reserved: 0 }, // Healthy (8)
        { sku: 'SKU-FURN-DSK-007', whId: whDelId, onHand: 3, reserved: 0 }, // Low Stock (3 <= 5)

        // Product 8: Ergonomic Mouse (Reorder: 15)
        { sku: 'SKU-COMP-MOU-008', whId: whMumId, onHand: 70, reserved: 5 }, // Healthy (65)
        { sku: 'SKU-COMP-MOU-008', whId: whBlrId, onHand: 45, reserved: 0 }, // Healthy (45)
        { sku: 'SKU-COMP-MOU-008', whId: whDelId, onHand: 12, reserved: 0 }, // Low Stock (12 <= 15)

        // Product 9: 65W GaN Charger (Reorder: 30)
        { sku: 'SKU-MOBL-CHG-009', whId: whMumId, onHand: 120, reserved: 0 }, // Healthy (120)
        { sku: 'SKU-MOBL-CHG-009', whId: whBlrId, onHand: 90, reserved: 0 }, // Healthy (90)
        { sku: 'SKU-MOBL-CHG-009', whId: whDelId, onHand: 50, reserved: 0 }, // Healthy (50)

        // Product 10: Vernier Caliper (Reorder: 10)
        { sku: 'SKU-INDT-CAL-010', whId: whMumId, onHand: 30, reserved: 0 }, // Healthy (30)
        { sku: 'SKU-INDT-CAL-010', whId: whBlrId, onHand: 15, reserved: 0 }, // Healthy (15)
        { sku: 'SKU-INDT-CAL-010', whId: whDelId, onHand: 8, reserved: 0 }, // Low Stock (8 <= 10)

        // Product 11: True-RMS Multimeter (Reorder: 10)
        { sku: 'SKU-INDT-DMM-011', whId: whMumId, onHand: 25, reserved: 0 }, // Healthy (25)
        { sku: 'SKU-INDT-DMM-011', whId: whBlrId, onHand: 14, reserved: 0 }, // Healthy (14)
        { sku: 'SKU-INDT-DMM-011', whId: whDelId, onHand: 0, reserved: 0 }, // Out of Stock (0)

        // Product 12: Laser Distance Measure (Reorder: 12)
        { sku: 'SKU-INDT-LTM-012', whId: whMumId, onHand: 40, reserved: 2 }, // Healthy (38)
        { sku: 'SKU-INDT-LTM-012', whId: whBlrId, onHand: 22, reserved: 0 }, // Healthy (22)
        { sku: 'SKU-INDT-LTM-012', whId: whDelId, onHand: 10, reserved: 0 }, // Low Stock (10 <= 12)
      ];

      for (const alloc of stockAllocations) {
        const prod = productMap.get(alloc.sku)!;
        const [existingBal] = await tx`
          SELECT id, on_hand_qty, reserved_qty FROM inventory_balances
          WHERE warehouse_id = ${alloc.whId} AND product_id = ${prod.id};
        `;

        if (!existingBal) {
          // Insert initial balance
          await tx`
            INSERT INTO inventory_balances (warehouse_id, product_id, on_hand_qty, reserved_qty, quarantined_qty)
            VALUES (${alloc.whId}, ${prod.id}, ${alloc.onHand.toFixed(2)}, ${alloc.reserved.toFixed(2)}, '0.00');
          `;

          // Append to audit movement ledger if on-hand stock > 0
          if (alloc.onHand > 0) {
            await tx`
              INSERT INTO inventory_movements (
                warehouse_id, product_id, movement_type, quantity, balance_before, balance_after,
                reference_type, reference_id, actor_id, reason
              )
              VALUES (
                ${alloc.whId}, ${prod.id}, 'RECEIPT', ${alloc.onHand.toFixed(2)}, '0.00', ${alloc.onHand.toFixed(2)},
                'OPENING_STOCK', 'INIT-DEMO-2026', ${adminId}, 'Demonstration catalog opening inventory verification'
              );
            `;
          }
        } else {
          // Update existing balance to reflect demo allocation
          await tx`
            UPDATE inventory_balances
            SET on_hand_qty = ${alloc.onHand.toFixed(2)}, reserved_qty = ${alloc.reserved.toFixed(2)}, quarantined_qty = '0.00', updated_at = NOW()
            WHERE id = ${existingBal.id};
          `;
        }
      }

      // 8. Seed Realistic Purchase Orders & Goods Receipts
      console.log('📝 Seeding realistic procurement orders with Indian vendor costs...');
      const supBharatId = supplierMap.get('SUP-IND-01')!;
      const supVanguardId = supplierMap.get('SUP-IND-02')!;

      const demoPOs = [
        {
          poNumber: 'PO-DEMO-2026-001',
          supplierId: supBharatId,
          warehouseId: whMumId,
          status: 'RECEIVED',
          expectedArrivalDate: '2026-10-20',
          items: [
            { sku: 'SKU-ELEC-NC-001', qty: 50, cost: '4500.0000' }, // ₹2,25,000.00
            { sku: 'SKU-COMP-MON-003', qty: 20, cost: '16500.0000' }, // ₹3,30,000.00
            { sku: 'SKU-MOBL-PB-004', qty: 100, cost: '1100.0000' }, // ₹1,10,000.00
          ],
        },
        {
          poNumber: 'PO-DEMO-2026-002',
          supplierId: supVanguardId,
          warehouseId: whBlrId,
          status: 'APPROVED',
          expectedArrivalDate: '2026-11-05',
          items: [
            { sku: 'SKU-FURN-CHR-002', qty: 25, cost: '7200.0000' }, // ₹1,80,000.00
            { sku: 'SKU-FURN-DSK-007', qty: 15, cost: '14200.0000' }, // ₹2,13,000.00
            { sku: 'SKU-INDT-DMM-011', qty: 30, cost: '2100.0000' }, // ₹63,000.00
          ],
        },
      ];

      for (const poData of demoPOs) {
        let totalCostNum = 0;
        const processedItems = poData.items.map((it) => {
          const prod = productMap.get(it.sku)!;
          const lineTotal = (it.qty * Number(it.cost)).toFixed(4);
          totalCostNum += Number(lineTotal);
          return {
            productId: prod.id,
            quantityOrdered: it.qty.toFixed(2),
            quantityReceived: poData.status === 'RECEIVED' ? it.qty.toFixed(2) : '0.00',
            unitCost: it.cost,
            lineTotal,
          };
        });

        const [savedPO] = await tx`
          INSERT INTO purchase_orders (
            po_number, supplier_id, destination_warehouse_id, status, total_cost,
            expected_arrival_date, created_by, approved_by, approved_at
          )
          VALUES (
            ${poData.poNumber}, ${poData.supplierId}, ${poData.warehouseId}, ${poData.status}, ${totalCostNum.toFixed(4)},
            ${poData.expectedArrivalDate}, ${adminId}, ${adminId}, NOW()
          )
          ON CONFLICT (po_number) DO UPDATE
          SET status = EXCLUDED.status, total_cost = EXCLUDED.total_cost
          RETURNING id, po_number;
        `;

        // Insert line items
        for (const item of processedItems) {
          const [existingLine] = await tx`
            SELECT id FROM purchase_order_items
            WHERE purchase_order_id = ${savedPO.id} AND product_id = ${item.productId};
          `;
          if (!existingLine) {
            await tx`
              INSERT INTO purchase_order_items (
                purchase_order_id, product_id, quantity_ordered, quantity_received, unit_cost, line_total
              )
              VALUES (
                ${savedPO.id}, ${item.productId}, ${item.quantityOrdered}, ${item.quantityReceived}, ${item.unitCost}, ${item.lineTotal}
              );
            `;
          }
        }

        // If RECEIVED, create corresponding Goods Receipt
        if (poData.status === 'RECEIVED') {
          const receiptNumber = `GR-${poData.poNumber}`;
          const [savedGR] = await tx`
            INSERT INTO goods_receipts (receipt_number, purchase_order_id, warehouse_id, received_by)
            VALUES (${receiptNumber}, ${savedPO.id}, ${poData.warehouseId}, ${adminId})
            ON CONFLICT (receipt_number) DO NOTHING
            RETURNING id;
          `;

          if (savedGR) {
            for (const item of processedItems) {
              await tx`
                INSERT INTO goods_receipt_items (goods_receipt_id, product_id, quantity_received, unit_cost)
                VALUES (${savedGR.id}, ${item.productId}, ${item.quantityReceived}, ${item.unitCost})
                ON CONFLICT DO NOTHING;
              `;
            }
          }
        }
      }

      // 9. Seed Realistic Customer Sales Orders & Reservations
      console.log('🛒 Seeding realistic customer sales orders and active stock reservations...');
      const demoSOs = [
        {
          orderNumber: 'SO-DEMO-2026-101',
          warehouseId: whMumId,
          customerName: 'Tata Consultancy Enterprise Facilities',
          customerEmail: 'it.procurement@tcs.example.com',
          status: 'CONFIRMED',
          items: [
            { sku: 'SKU-ELEC-NC-001', qty: 3, price: '8999.0000' }, // ₹26,997.00 (Reserved)
            { sku: 'SKU-COMP-MON-003', qty: 5, price: '24999.0000' }, // ₹1,24,995.00 (Reserved)
          ],
        },
        {
          orderNumber: 'SO-DEMO-2026-102',
          warehouseId: whMumId,
          customerName: 'Infosys Workspace Technologies',
          customerEmail: 'workspaces@infosys.example.com',
          status: 'DELIVERED',
          items: [
            { sku: 'SKU-FURN-CHR-002', qty: 2, price: '12499.0000' }, // ₹24,998.00
            { sku: 'SKU-COMP-KB-005', qty: 4, price: '4299.0000' }, // ₹17,196.00
          ],
        },
      ];

      for (const soData of demoSOs) {
        let subtotalNum = 0;
        const processedItems = soData.items.map((it) => {
          const prod = productMap.get(it.sku)!;
          const lineTotal = (it.qty * Number(it.price)).toFixed(4);
          subtotalNum += Number(lineTotal);
          return {
            productId: prod.id,
            quantity: it.qty.toFixed(2),
            unitPrice: it.price,
            lineTotal,
          };
        });

        const [savedSO] = await tx`
          INSERT INTO sales_orders (
            order_number, warehouse_id, customer_name, customer_email, status,
            subtotal, tax_amount, total_amount, created_by
          )
          VALUES (
            ${soData.orderNumber}, ${soData.warehouseId}, ${soData.customerName}, ${soData.customerEmail}, ${soData.status},
            ${subtotalNum.toFixed(4)}, '0.0000', ${subtotalNum.toFixed(4)}, ${adminId}
          )
          ON CONFLICT (order_number) DO UPDATE
          SET status = EXCLUDED.status, subtotal = EXCLUDED.subtotal, total_amount = EXCLUDED.total_amount
          RETURNING id, order_number;
        `;

        // Insert sales order items
        for (const item of processedItems) {
          const [existingLine] = await tx`
            SELECT id FROM sales_order_items
            WHERE sales_order_id = ${savedSO.id} AND product_id = ${item.productId};
          `;
          if (!existingLine) {
            await tx`
              INSERT INTO sales_order_items (sales_order_id, product_id, quantity, unit_price, line_total)
              VALUES (${savedSO.id}, ${item.productId}, ${item.quantity}, ${item.unitPrice}, ${item.lineTotal});
            `;
          }

          // If CONFIRMED, create stock reservation record
          if (soData.status === 'CONFIRMED') {
            const [existingRes] = await tx`
              SELECT id FROM stock_reservations
              WHERE sales_order_id = ${savedSO.id} AND product_id = ${item.productId};
            `;
            if (!existingRes) {
              await tx`
                INSERT INTO stock_reservations (sales_order_id, warehouse_id, product_id, reserved_qty, status)
                VALUES (${savedSO.id}, ${soData.warehouseId}, ${item.productId}, ${item.quantity}, 'ACTIVE');
              `;
            }
          }
        }
      }

      console.log('✅ Demonstration dataset successfully initialized and synchronized.');
    });

    console.log('🎉 Demo catalog seeding finished successfully.');
  } catch (error: any) {
    console.error('❌ Failed to execute demo seed:', error.message);
    throw error;
  } finally {
    await sql.end();
  }
}

// Allow CLI execution if invoked directly
if (process.argv[1]?.endsWith('seed-demo.ts')) {
  runDemoSeed({ cleanTestFixtures: true })
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
