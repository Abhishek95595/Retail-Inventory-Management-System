let allProducts = [];

// DOM Elements
const kpiValuation = document.getElementById('kpiValuation');
const kpiTotalItems = document.getElementById('kpiTotalItems');
const kpiLowStock = document.getElementById('kpiLowStock');
const kpiStockouts = document.getElementById('kpiStockouts');
const inventoryTableBody = document.getElementById('inventoryTableBody');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const statusFilter = document.getElementById('statusFilter');

// Modals
const addModal = document.getElementById('addModal');
const btnOpenAddModal = document.getElementById('btnOpenAddModal');
const btnCloseAddModal = document.getElementById('btnCloseAddModal');
const btnCancelAdd = document.getElementById('btnCancelAdd');
const addProductForm = document.getElementById('addProductForm');

const adjustModal = document.getElementById('adjustModal');
const btnCloseAdjustModal = document.getElementById('btnCloseAdjustModal');
const btnCancelAdjust = document.getElementById('btnCancelAdjust');
const adjustStockForm = document.getElementById('adjustStockForm');
const adjustProductId = document.getElementById('adjustProductId');
const adjustProductInfo = document.getElementById('adjustProductInfo');

// Fetch Metrics
async function loadMetrics() {
  try {
    const res = await fetch('/api/metrics');
    const json = await res.json();
    if (json.success) {
      const data = json.data;
      kpiValuation.textContent = `$${data.totalValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      kpiTotalItems.textContent = data.totalProducts;
      kpiLowStock.textContent = data.lowStockCount;
      kpiStockouts.textContent = data.outOfStockCount;
    }
  } catch (err) {
    console.error('Failed to load metrics:', err);
  }
}

// Fetch Products
async function loadProducts() {
  try {
    const search = searchInput.value.trim();
    const category = categoryFilter.value;
    const status = statusFilter.value;

    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (category) params.append('category', category);
    if (status) params.append('status', status);

    const res = await fetch(`/api/products?${params.toString()}`);
    const json = await res.json();

    if (json.success) {
      allProducts = json.data;
      renderTable(allProducts);
    }
  } catch (err) {
    console.error('Failed to load products:', err);
  }
}

function renderTable(products) {
  if (products.length === 0) {
    inventoryTableBody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 2rem; color: #94a3b8;">No matching inventory products found.</td></tr>`;
    return;
  }

  inventoryTableBody.innerHTML = products.map(p => {
    let badgeClass = 'badge-success';
    let statusLabel = 'Adequate';

    if (p.stockStatus === 'OUT_OF_STOCK') {
      badgeClass = 'badge-danger';
      statusLabel = 'Out of Stock';
    } else if (p.stockStatus === 'CRITICAL_REORDER') {
      badgeClass = 'badge-danger';
      statusLabel = 'Critical Reorder';
    } else if (p.stockStatus === 'LOW_STOCK') {
      badgeClass = 'badge-warning';
      statusLabel = 'Low Stock';
    }

    return `
      <tr>
        <td>
          <div class="product-sku">${escapeHtml(p.sku)}</div>
          <div class="product-name">${escapeHtml(p.name)}</div>
        </td>
        <td><span style="color: #cbd5e1;">${escapeHtml(p.category)}</span></td>
        <td>
          <div>$${p.costPrice.toFixed(2)} <span style="color:#94a3b8; font-size: 0.75rem;">(Cost)</span></div>
          <div style="color:#94a3b8; font-size: 0.8rem;">$${p.sellingPrice.toFixed(2)} (Sell)</div>
        </td>
        <td><strong>${p.onHandQty}</strong></td>
        <td><span style="color: #94a3b8;">${p.reservedQty}</span></td>
        <td><strong style="color: ${p.availableQty === 0 ? '#ef4444' : '#f8fafc'}">${p.availableQty}</strong></td>
        <td><span style="color: #94a3b8;">${p.reorderPoint}</span></td>
        <td><strong>$${p.totalValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
        <td><span class="badge ${badgeClass}">${statusLabel}</span></td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="openAdjustModal('${p.id}')">Adjust Stock</button>
        </td>
      </tr>
    `;
  }).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Adjust Modal Logic
window.openAdjustModal = function(id) {
  const prod = allProducts.find(p => p.id === id);
  if (!prod) return;

  adjustProductId.value = prod.id;
  adjustProductInfo.innerHTML = `<strong>${escapeHtml(prod.name)}</strong> (${escapeHtml(prod.sku)})<br>On Hand: ${prod.onHandQty} | Available: ${prod.availableQty} | Reorder Point: ${prod.reorderPoint}`;
  adjustModal.classList.remove('hidden');
};

function closeAdjust() {
  adjustModal.classList.add('hidden');
  adjustStockForm.reset();
}

btnCloseAdjustModal.addEventListener('click', closeAdjust);
btnCancelAdjust.addEventListener('click', closeAdjust);

adjustStockForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = adjustProductId.value;
  const type = document.getElementById('adjustType').value;
  const quantity = document.getElementById('adjustQty').value;
  const reason = document.getElementById('adjustReason').value;

  try {
    const res = await fetch(`/api/products/${id}/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, quantity, reason })
    });
    const result = await res.json();
    if (!result.success) {
      alert(`Error: ${result.error}`);
      return;
    }
    closeAdjust();
    await loadMetrics();
    await loadProducts();
  } catch (err) {
    alert('Failed to commit stock adjustment.');
  }
});

// Add Product Modal Logic
btnOpenAddModal.addEventListener('click', () => addModal.classList.remove('hidden'));
function closeAdd() {
  addModal.classList.add('hidden');
  addProductForm.reset();
}
btnCloseAddModal.addEventListener('click', closeAdd);
btnCancelAdd.addEventListener('click', closeAdd);

addProductForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    sku: document.getElementById('sku').value,
    name: document.getElementById('name').value,
    category: document.getElementById('category').value,
    uom: document.getElementById('uom').value,
    costPrice: document.getElementById('costPrice').value,
    sellingPrice: document.getElementById('sellingPrice').value,
    onHandQty: document.getElementById('onHandQty').value,
    reorderPoint: document.getElementById('reorderPoint').value
  };

  try {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (!result.success) {
      alert(`Error: ${result.error}`);
      return;
    }
    closeAdd();
    await loadMetrics();
    await loadProducts();
  } catch (err) {
    alert('Failed to add product.');
  }
});

// Event Listeners for Filters
searchInput.addEventListener('input', () => loadProducts());
categoryFilter.addEventListener('change', () => loadProducts());
statusFilter.addEventListener('change', () => loadProducts());
document.getElementById('btnRefresh').addEventListener('click', () => {
  loadMetrics();
  loadProducts();
});

// Initial boot
loadMetrics();
loadProducts();
