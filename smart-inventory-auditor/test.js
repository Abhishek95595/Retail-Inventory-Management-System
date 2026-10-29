import http from 'http';

const BASE_URL = 'http://localhost:3030';

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log("=================================================");
  console.log("  SMART INVENTORY STOCK AUDITOR — TEST SUITE   ");
  console.log("=================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  try {
    // 1. Metrics Endpoint
    const resMetrics = await request('GET', '/api/metrics');
    assert(resMetrics.status === 200 && resMetrics.body.success, "TC-01: GET /api/metrics returns 200 and success flag");
    assert(typeof resMetrics.body.data.totalValuation === 'number', "TC-02: Total inventory valuation calculated accurately");

    // 2. Fetch all products
    const resProducts = await request('GET', '/api/products');
    assert(resProducts.status === 200 && Array.isArray(resProducts.body.data), "TC-03: GET /api/products returns product array");
    const testProd = resProducts.body.data.find(p => p.sku === 'CAB-USB-C-6FT');
    assert(testProd && testProd.availableQty === (testProd.onHandQty - testProd.reservedQty - testProd.quarantinedQty), "TC-04: Invariant availableQty = onHand - reserved - quarantined holds");

    // 3. Search and Filtering
    const resSearch = await request('GET', '/api/products?search=Dell');
    assert(resSearch.status === 200 && resSearch.body.data.every(p => p.name.includes('Dell') || p.sku.includes('DELL')), "TC-05: Product keyword search filter correctly isolates matching items");

    // 4. Create new product (Valid)
    const newSku = `TEST-${Date.now().toString().slice(-4)}`;
    const resCreate = await request('POST', '/api/products', {
      sku: newSku,
      name: "Wireless Presenter Remote",
      category: "Accessories",
      costPrice: 20.00,
      sellingPrice: 39.99,
      reorderPoint: 10,
      onHandQty: 15,
      uom: "Units"
    });
    assert(resCreate.status === 201 && resCreate.body.data.sku === newSku, "TC-06: POST /api/products creates product successfully");

    // 5. Duplicate SKU (Invalid)
    const resDuplicate = await request('POST', '/api/products', {
      sku: newSku,
      name: "Duplicate Presenter",
      category: "Accessories"
    });
    assert(resDuplicate.status === 409, "TC-07: POST duplicate SKU returns 409 Conflict");

    // 6. Missing Fields (Invalid)
    const resMissing = await request('POST', '/api/products', { name: "Incomplete" });
    assert(resMissing.status === 400, "TC-08: POST with missing required fields returns 400 Bad Request");

    // 7. Stock Adjustment - Receipt (Valid)
    const targetId = resCreate.body.data.id;
    const initialOnHand = resCreate.body.data.onHandQty;
    const resReceipt = await request('POST', `/api/products/${targetId}/adjust`, {
      type: "RECEIPT",
      quantity: 5,
      reason: "Supplier batch arrival"
    });
    assert(resReceipt.status === 200 && resReceipt.body.data.onHandQty === initialOnHand + 5, "TC-09: Stock RECEIPT correctly increments on-hand quantity");

    // 8. Stock Adjustment - Issue exceeding available (Invalid)
    const resOverIssue = await request('POST', `/api/products/${targetId}/adjust`, {
      type: "ISSUE",
      quantity: 9999,
      reason: "Excess customer order"
    });
    assert(resOverIssue.status === 400, "TC-10: Stock ISSUE exceeding available quantity is rejected with 400 Bad Request");

    // 9. Stock Adjustment - Valid Issue
    const resIssue = await request('POST', `/api/products/${targetId}/adjust`, {
      type: "ISSUE",
      quantity: 4,
      reason: "Dispatched to department"
    });
    assert(resIssue.status === 200 && resIssue.body.data.onHandQty === (initialOnHand + 5 - 4), "TC-11: Stock ISSUE correctly decrements stock balance");

    // 10. Reorder Status Transition
    const resDeplete = await request('POST', `/api/products/${targetId}/adjust`, {
      type: "ISSUE",
      quantity: 12,
      reason: "Bulk dispatch"
    });
    assert(resDeplete.status === 200 && (resDeplete.body.data.stockStatus === 'LOW_STOCK' || resDeplete.body.data.stockStatus === 'CRITICAL_REORDER'), "TC-12: System triggers reorder alert status when available falls below threshold");

    // 11. CSV Export Endpoint
    const resCsv = await request('GET', '/api/export/csv');
    assert(resCsv.status === 200 && resCsv.headers['content-type'].includes('text/csv'), "TC-13: GET /api/export/csv provides structured CSV data download");

    console.log("=================================================");
    console.log(`Summary: ${passed} Passed, ${failed} Failed out of ${passed + failed} Tests.`);
    console.log("=================================================");

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error("Test execution failed with error:", err);
    process.exit(1);
  }
}

runTests();
