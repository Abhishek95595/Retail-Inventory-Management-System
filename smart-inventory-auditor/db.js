import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, 'inventory_data.json');

const INITIAL_DATA = [
  {
    id: "prod-101",
    sku: "LAP-DELL-XPS13",
    name: "Dell XPS 13 Laptop",
    category: "Electronics",
    costPrice: 950.00,
    sellingPrice: 1299.99,
    reorderPoint: 10,
    onHandQty: 18,
    reservedQty: 3,
    quarantinedQty: 0,
    uom: "Units"
  },
  {
    id: "prod-102",
    sku: "LOGI-MX-MAS3S",
    name: "Logitech MX Master 3S Mouse",
    category: "Accessories",
    costPrice: 65.00,
    sellingPrice: 99.99,
    reorderPoint: 25,
    onHandQty: 22,
    reservedQty: 2,
    quarantinedQty: 0,
    uom: "Units"
  },
  {
    id: "prod-103",
    sku: "MEC-KBD-RGB",
    name: "Mechanical Gaming Keyboard RGB",
    category: "Accessories",
    costPrice: 45.00,
    sellingPrice: 79.99,
    reorderPoint: 15,
    onHandQty: 12,
    reservedQty: 4,
    quarantinedQty: 1,
    uom: "Units"
  },
  {
    id: "prod-104",
    sku: "MON-DELL-U2723",
    name: "Dell UltraSharp 27\" 4K Monitor",
    category: "Electronics",
    costPrice: 420.00,
    sellingPrice: 599.99,
    reorderPoint: 8,
    onHandQty: 0,
    reservedQty: 0,
    quarantinedQty: 0,
    uom: "Units"
  },
  {
    id: "prod-105",
    sku: "CAB-USB-C-6FT",
    name: "Braided USB-C Cable (2m)",
    category: "Cables",
    costPrice: 4.50,
    sellingPrice: 14.99,
    reorderPoint: 50,
    onHandQty: 120,
    reservedQty: 10,
    quarantinedQty: 0,
    uom: "Units"
  },
  {
    id: "prod-106",
    sku: "AUD-SONY-WH1000",
    name: "Sony WH-1000XM5 Headphones",
    category: "Audio",
    costPrice: 260.00,
    sellingPrice: 399.99,
    reorderPoint: 12,
    onHandQty: 9,
    reservedQty: 1,
    quarantinedQty: 0,
    uom: "Units"
  },
  {
    id: "prod-107",
    sku: "ERG-STD-DESK",
    name: "Electric Standing Desk Frame",
    category: "Furniture",
    costPrice: 180.00,
    sellingPrice: 320.00,
    reorderPoint: 5,
    onHandQty: 14,
    reservedQty: 2,
    quarantinedQty: 0,
    uom: "Units"
  }
];

export function getDatabase() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(INITIAL_DATA, null, 2), 'utf-8');
    return INITIAL_DATA;
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading database, restoring defaults:", err);
    fs.writeFileSync(DATA_FILE, JSON.stringify(INITIAL_DATA, null, 2), 'utf-8');
    return INITIAL_DATA;
  }
}

export function saveDatabase(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Computes core business logic invariants:
 * 1. Available Quantity = OnHand - Reserved - Quarantined
 * 2. Total Valuation = OnHand * CostPrice
 * 3. Reorder Status:
 *    - 'OUT_OF_STOCK' if onHand <= 0
 *    - 'CRITICAL_REORDER' if available <= reorderPoint / 2
 *    - 'LOW_STOCK' if available <= reorderPoint
 *    - 'ADEQUATE' otherwise
 * 4. Recommended Reorder Quantity = max(0, (reorderPoint * 2) - available)
 */
export function enrichProductData(p) {
  const onHand = Number(p.onHandQty) || 0;
  const reserved = Number(p.reservedQty) || 0;
  const quarantined = Number(p.quarantinedQty) || 0;
  const cost = Number(p.costPrice) || 0;
  const selling = Number(p.sellingPrice) || 0;
  const reorderPoint = Number(p.reorderPoint) || 0;

  const available = Math.max(0, onHand - reserved - quarantined);
  const totalValuation = Math.round((onHand * cost) * 100) / 100;
  const profitMarginPercent = cost > 0 ? Math.round(((selling - cost) / cost) * 1000) / 10 : 0;

  let stockStatus = 'ADEQUATE';
  let statusBadge = 'success';

  if (onHand <= 0) {
    stockStatus = 'OUT_OF_STOCK';
    statusBadge = 'danger';
  } else if (available <= reorderPoint / 2) {
    stockStatus = 'CRITICAL_REORDER';
    statusBadge = 'danger';
  } else if (available <= reorderPoint) {
    stockStatus = 'LOW_STOCK';
    statusBadge = 'warning';
  }

  const suggestedReorderQty = available < reorderPoint ? Math.max(0, (reorderPoint * 2) - available) : 0;

  return {
    ...p,
    availableQty: available,
    totalValuation,
    profitMarginPercent,
    stockStatus,
    statusBadge,
    suggestedReorderQty
  };
}

export function calculateSummaryMetrics(products) {
  let totalValuation = 0;
  let totalOnHand = 0;
  let totalAvailable = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  const enriched = products.map(enrichProductData);

  for (const item of enriched) {
    totalValuation += item.totalValuation;
    totalOnHand += item.onHandQty;
    totalAvailable += item.availableQty;
    if (item.stockStatus === 'OUT_OF_STOCK') {
      outOfStockCount++;
    } else if (item.stockStatus === 'LOW_STOCK' || item.stockStatus === 'CRITICAL_REORDER') {
      lowStockCount++;
    }
  }

  return {
    totalProducts: enriched.length,
    totalValuation: Math.round(totalValuation * 100) / 100,
    totalOnHand,
    totalAvailable,
    lowStockCount,
    outOfStockCount,
    healthyStockCount: enriched.length - lowStockCount - outOfStockCount
  };
}
