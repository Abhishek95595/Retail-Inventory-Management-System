# Smart Inventory Stock Auditor & Reorder Forecasting System (SIS-Audit)
### Academic Mini-Project Submission | B.Tech Computer Science & Engineering

---

## 1. Project Overview
This mini-project was extracted and simplified from a large multi-warehouse enterprise **Retail Inventory Management System (RIMS)**. 

While the full enterprise system includes 8 Epics (NextAuth, PostgreSQL with Drizzle ORM, multi-warehouse transfers, purchase orders, goods receipts, and complex RBAC), this mini-project focuses specifically on the **core business logic and computational heart**:
- Real-time stock valuation ($\sum \text{On-Hand} \times \text{Cost Price}$)
- Mathematical inventory invariants ($\text{Available} = \text{On-Hand} - \text{Reserved} - \text{Quarantined}$)
- Automated reorder point threshold forecasting ($\text{Available} \le \text{Reorder Point}$)
- Transactional stock receipts and issues with overdraft protection
- Instant CSV audit export

It runs completely self-contained with **zero external database dependencies** (no PostgreSQL or Docker required), making it ideal for college project evaluation, live viva demonstration, and code explanation.

---

## 2. Prerequisites
- **Node.js**: v18.0.0 or higher (Tested on Node.js v24)
- **npm**: v9.0.0 or higher
- **Web Browser**: Chrome, Firefox, Edge, or Safari

---

## 3. How to Run the Mini-Project

### Step 1: Open the mini-project directory
```bash
cd smart-inventory-auditor
```

### Step 2: Install dependencies (Express)
```bash
npm install
```

### Step 3: Start the server
```bash
npm start
```
*The server will boot on:* `http://localhost:3030`

### Step 4: Open the dashboard
Open your web browser and navigate to:
```
http://localhost:3030
```

---

## 4. How to Run Automated Verification Tests
In a separate terminal tab, run:
```bash
npm test
```
This executes all 13 automated tests against the running server, verifying:
- Invariant calculations
- Reorder status transitions
- Validation error handling (preventing over-issuing stock)
- Duplicate SKU detection
- CSV export generation

---

## 5. Live Demonstration Script for Viva / Evaluation
1. **Show KPI Cards**: Highlight the live Inventory Capital Valuation and tracked SKUs.
2. **Filter & Search**: Type "Dell" in the search box to demonstrate instant client-side filtering.
3. **Simulate a Stock Issue**: Click **"Adjust Stock"** on any item, choose **"Stock Outward (Issue)"**, and enter an amount that drops the stock below the Reorder Point. Notice how the status badge changes to **"Low Stock"** or **"Critical Reorder"**.
4. **Demonstrate Error Handling**: Try to issue more units than are available; the system will reject the transaction and show an error explaining that reserved items cannot be oversold.
5. **Simulate a Stock Receipt**: Receive stock from a supplier to bring the balance back above the threshold, watching the badge return to **"Adequate"**.
6. **Export CSV**: Click **"Export CSV"** to demonstrate immediate audit report generation.
