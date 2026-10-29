# PRESENTATION OUTLINE & SLIDE DECK SPECIFICATION
## Smart Inventory Stock Auditor & Reorder Forecasting System (SIS-Audit)
**Department of Computer Science & Engineering | Academic Project Defense (Viva Voce)**

---

### Slide 1: Title & Candidacy
- **Project Title:** Smart Inventory Stock Auditor & Reorder Forecasting System
- **Subtitle:** A Lightweight Invariant-Preserving Inventory Valuation & Safety Stock Engine
- **Degree:** Bachelor of Technology in Computer Science & Engineering
- **Presenter:** [Candidate Name] (Roll No: [Registration Number])
- **Mentor / Supervisor:** [Faculty Guide Name]
- **Institution:** Department of Computer Science & Engineering, [College Name]

---

### Slide 2: Problem Statement & Motivation
- **Context:** Retail SMEs lose up to 12% in annual profits from inventory distortion (untracked stockouts and excessive holding costs).
- **Core Issues in Existing Systems:**
  - Decoupled stock calculations: Failing to reserve stock allocations before sales fulfillment leads to overselling.
  - Delayed batch alerts: Safety reorder points calculated in nightly batches rather than real-time transactional evaluations.
  - Excessive infrastructure friction: Heavy enterprise systems require external database servers, multi-table triggers, and complex authentication for basic stock tracking.
- **Project Goal:** Extract and build an independent, mathematically rigorous, zero-dependency stock auditor suitable for small-scale retail and academic demonstration.

---

### Slide 3: Objectives & Theoretical Invariants
- **Primary Objectives:**
  1. Maintain strict real-time mathematical consistency across all stock mutations.
  2. Provide dynamic capital valuation and profit margin analytics.
  3. Automate urgency-ranked reorder forecasting.
  4. Ensure zero-setup portable execution with instant audit export.
- **Core Mathematical Invariants:**
  - **Availability Invariant:**
    $$\text{Available Quantity} = \text{On-Hand} - \text{Reserved} - \text{Quarantined}$$
  - **Valuation Invariant:**
    $$\text{Total Valuation} = \sum_{i=1}^{N} \left(\text{On-Hand}_i \times \text{Cost Price}_i\right)$$
  - **Reorder Forecast:**
    $$\text{Status} = \begin{cases} \text{OUT\_OF\_STOCK}, & \text{if } \text{On-Hand} \le 0 \\ \text{CRITICAL\_REORDER}, & \text{if } \text{Available} \le \frac{\text{ROP}}{2} \\ \text{LOW\_STOCK}, & \text{if } \text{Available} \le \text{ROP} \\ \text{ADEQUATE}, & \text{otherwise} \end{cases}$$

---

### Slide 4: System Architecture & Technology Stack
- **Architecture:** Clean 3-Tier Layered Architecture:
  - **Tier 1 (Presentation):** Single-page web dashboard with vanilla CSS responsive grid, dynamic KPI cards, and asynchronous Fetch API.
  - **Tier 2 (Application Service):** Node.js / Express REST controller exposing strict validation endpoints.
  - **Tier 3 (Persistence & Invariant Engine):** Embedded JSON store with atomic file writes ensuring zero-external database configuration.
- **Why this Stack?**
  - Instant local startup without PostgreSQL/Docker daemons.
  - Direct mapping between database state and UI state.
  - Highly defendable during viva voce examination.

---

### Slide 5: Core Algorithmic Workflow (Stock Adjustment)
- **Input Validation:** Rejects negative, zero, or fractional adjustments.
- **Stock Receipt Workflow:**
  - Atomically increments physical `onHandQty`.
  - Recalculates `availableQty` and capital valuation.
- **Stock Issue Workflow:**
  - Validates requested quantity against available stock ($\Delta \le \text{Available}$).
  - Strictly prevents negative stock or violating reserved allocations.
  - Atomically decrements `onHandQty`.
- **Dynamic Transition:**
  - Evaluates current threshold against Reorder Point (ROP) and instantly updates the status badge.

---

### Slide 6: Verification, Test Matrix & Results
- **Automated Test Suite (`test.js`):** 13 comprehensive integration and invariant tests.
- **Key Test Cases:**
  - `TC-04`: Verified invariant: $\text{Available} = \text{On-Hand} - \text{Reserved} - \text{Quarantined}$ across all items.
  - `TC-07`: Rejection of duplicate SKU injection (HTTP 409 Conflict).
  - `TC-08`: Rejection of incomplete payloads (HTTP 400 Bad Request).
  - `TC-10`: Rejection of stock issues exceeding available quantity (HTTP 400).
  - `TC-12`: Verification of automated state change from Adequate to Critical Reorder.
- **Result:** 13/13 Passed (100% test coverage for all core operations).

---

### Slide 7: Live Demonstration Walkthrough
- **Demonstration Flow:**
  1. **Launch:** Run `npm start` $\rightarrow$ Open `http://localhost:3030`.
  2. **Audit Overview:** Review live valuation KPIs and active catalog items.
  3. **Stock Issue Simulation:** Dispatch 12 units of *Wireless Presenter Remote* to observe instant status change to "Low Stock".
  4. **Stockout Validation:** Attempt an issue exceeding available stock to demonstrate error boundary protection.
  5. **Stock Receipt:** Receive 10 units to restore stock status back to "Adequate".
  6. **Export:** Download CSV audit report with one click.

---

### Slide 8: Limitations, Future Work & Conclusion
- **Limitations:**
  - Single-warehouse scope (multi-warehouse cross-docking omitted for simplicity).
  - File-based persistence intended for small/medium retail nodes.
- **Future Enhancements:**
  - Machine learning based moving average demand forecasting.
  - Camera-based barcode scanner integration via WebRTC/HTML5 APIs.
- **Conclusion:**
  - Successfully proved that enterprise-grade inventory safety and mathematical invariants can be extracted into an efficient, portable, and easily demonstrable mini-project.
