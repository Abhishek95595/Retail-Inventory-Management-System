import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getDatabase,
  saveDatabase,
  enrichProductData,
  calculateSummaryMetrics
} from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3030;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API: Get summary KPIs
app.get('/api/metrics', (req, res) => {
  const products = getDatabase();
  const metrics = calculateSummaryMetrics(products);
  res.json({ success: true, data: metrics });
});

// API: Get products with optional filter/search
app.get('/api/products', (req, res) => {
  const { search, category, status } = req.query;
  let products = getDatabase().map(enrichProductData);

  if (search) {
    const term = search.toLowerCase();
    products = products.filter(
      p => p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term)
    );
  }

  if (category && category !== 'ALL') {
    products = products.filter(p => p.category === category);
  }

  if (status && status !== 'ALL') {
    products = products.filter(p => p.stockStatus === status);
  }

  res.json({ success: true, count: products.length, data: products });
});

// API: Add new product
app.post('/api/products', (req, res) => {
  const { sku, name, category, costPrice, sellingPrice, reorderPoint, onHandQty, uom } = req.body;

  if (!sku || !name || !category) {
    return res.status(400).json({ success: false, error: 'SKU, Product Name, and Category are required.' });
  }

  const products = getDatabase();
  const existing = products.find(p => p.sku.toUpperCase() === sku.trim().toUpperCase());
  if (existing) {
    return res.status(409).json({ success: false, error: `SKU '${sku}' already exists in catalog.` });
  }

  const newProduct = {
    id: `prod-${Date.now().toString().slice(-4)}`,
    sku: sku.trim().toUpperCase(),
    name: name.trim(),
    category: category.trim(),
    costPrice: Math.max(0, parseFloat(costPrice) || 0),
    sellingPrice: Math.max(0, parseFloat(sellingPrice) || 0),
    reorderPoint: Math.max(0, parseInt(reorderPoint, 10) || 0),
    onHandQty: Math.max(0, parseInt(onHandQty, 10) || 0),
    reservedQty: 0,
    quarantinedQty: 0,
    uom: uom ? uom.trim() : 'Units'
  };

  products.push(newProduct);
  saveDatabase(products);

  res.status(201).json({ success: true, data: enrichProductData(newProduct) });
});

// API: Stock transaction (Receipt or Issue)
app.post('/api/products/:id/adjust', (req, res) => {
  const { id } = req.params;
  const { type, quantity, reason } = req.body;

  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty <= 0) {
    return res.status(400).json({ success: false, error: 'Adjustment quantity must be a positive integer.' });
  }

  if (!['RECEIPT', 'ISSUE'].includes(type)) {
    return res.status(400).json({ success: false, error: "Type must be either 'RECEIPT' or 'ISSUE'." });
  }

  const products = getDatabase();
  const index = products.findIndex(p => p.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Product not found.' });
  }

  const target = products[index];

  if (type === 'ISSUE') {
    const available = target.onHandQty - target.reservedQty - target.quarantinedQty;
    if (qty > available) {
      return res.status(400).json({
        success: false,
        error: `Cannot issue ${qty} units. Only ${available} available (${target.reservedQty} reserved, ${target.quarantinedQty} quarantined).`
      });
    }
    target.onHandQty -= qty;
  } else if (type === 'RECEIPT') {
    target.onHandQty += qty;
  }

  saveDatabase(products);

  res.json({
    success: true,
    message: `Successfully processed ${type} of ${qty} units.`,
    data: enrichProductData(target)
  });
});

// API: Export CSV report
app.get('/api/export/csv', (req, res) => {
  const products = getDatabase().map(enrichProductData);
  const headers = [
    'SKU',
    'Product Name',
    'Category',
    'Cost Price ($)',
    'Selling Price ($)',
    'On Hand Qty',
    'Reserved Qty',
    'Available Qty',
    'Reorder Point',
    'Line Valuation ($)',
    'Stock Status',
    'Suggested Reorder'
  ];

  const rows = products.map(p => [
    `"${p.sku}"`,
    `"${p.name.replace(/"/g, '""')}"`,
    `"${p.category}"`,
    p.costPrice.toFixed(2),
    p.sellingPrice.toFixed(2),
    p.onHandQty,
    p.reservedQty,
    p.availableQty,
    p.reorderPoint,
    p.totalValuation.toFixed(2),
    `"${p.stockStatus}"`,
    p.suggestedReorderQty
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="inventory_stock_audit_report.csv"');
  res.send(csvContent);
});

app.listen(PORT, () => {
  console.log(`[Smart Inventory Auditor] Server running on http://localhost:${PORT}`);
});
