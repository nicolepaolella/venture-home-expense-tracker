

# Planning Memory — 2026-05-12
**Contributor**: Project creator (via Ignition planning session)
**Session type**: Initial brainstorm and project definition

---

## What We're Building

We're building a mobile-first expense management system for Venture Home Solar's field sales teams. The system replaces a fully manual expense tracking process with a structured workflow: employees upload receipts from their phones throughout the month, build those receipts into monthly expense reports, and submit them through a two-tier approval chain (manager → admin/payroll). The system uses OCR to auto-populate receipt data, enforces business rules via violation warnings (never blocks), and provides admin dashboards for reporting, export, and audit.

The core workflow is built around a **receipt library** concept. Employees don't submit expenses one at a time — they snap photos of receipts as they go, and those receipts sit in their personal library as "unreported." At the end of the month (or whenever they're ready), they select receipts from their library, bundle them into an expense report, and submit. This design removes friction from the capture moment while keeping submission organized. Managers then review and approve/reject at the line-item level — they can approve 7 of 8 receipts and reject or request clarification on just one without affecting the rest.

The system serves four user roles: employees (submit only their own expenses), managers (submit their own + approve their team's), admin/payroll/accounting (full control, export, reporting, user management), and potentially executives (read-only reports). The approval chain is simple and consistent: employee → manager → admin. When a manager submits their own expenses, it goes directly to admin (skipping the manager tier). This workflow will remain the same even when the system expands to other departments.

This is 90% a phone-based tool. Field sales employees are out on job sites and in their cars. The entire experience must be designed mobile-first: snap a receipt photo, confirm OCR-extracted data, and move on. The desktop experience matters primarily for admins running reports and doing batch exports.

## Why We're Building It

Venture Home Solar currently has no system for tracking employee expenses. Expenses aren't captured in Sage Intacct at all. Reimbursement data for CoAdvantage (their payroll PEO) is manually entered by copying and pasting from spreadsheets sorted by location/department. This creates:

- **Delays in reimbursement** — employees wait longer to get paid back because the manual process is slow and error-prone
- **No audit trail** — there's no systematic record of who approved what, when, or why
- **No policy enforcement** — rules like the $400/month fuel limit, receipt requirements, and duplicate detection are entirely manual
- **Accounting gaps** — expenses never flow into Sage Intacct, meaning the books are incomplete
- **Approval bottlenecks** — managers have no structured way to review and approve expenses

If this works, the company gets: faster employee reimbursements, clean audit trails for compliance, automated policy enforcement, structured data for accounting, and a system that can scale company-wide beyond the initial sales department. The immediate department is sales (CT Sales, MA/RI Sales), but the architecture must support adding departments, locations, and categories without rebuilding.

## Decisions Made

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| **Mobile-first design** | All screens designed for mobile viewport first | 90% of usage is from phones in the field |
| **Violation warnings, never blocks** | System flags issues but never prevents submission | Owner wants smooth workflow; blocking creates frustration for field workers |
| **Receipt library model** | Employees upload receipts anytime, bundle into reports later | Matches the real-world pattern of monthly submissions while removing friction from the capture moment |
| **Line-by-line approval** | Managers approve/reject individual items within a report | One bad receipt shouldn't hold up the entire report |
| **Calendar month limits** | $400 fuel limit is per calendar month, not rolling | Simpler to understand and implement |
| **Duplicate detection scope** | Only flags duplicates among submitted expenses, not unreported receipts | Unreported receipts are just a staging area; duplicates only matter when money is being claimed |
| **Photo retake over manual entry** | When OCR can't read a receipt, prompt retake instead of fallback to manual entry | Better data quality, and mobile camera is always available |
| **Frontend stack** | React (JSX) with inline styles | Fast iteration for MVP, mobile-first responsive |
| **Design system** | Dark theme, JetBrains Mono for data, Outfit for UI text | Professional look appropriate for a business tool; monospace for financial data readability |
| **Hosting model** | Google Cloud Platform (Cloud Run, GCS) | TBD on final architecture, but GCP is the direction |
| **Data retention** | Keep all expense data indefinitely (1-2 year minimum for lookback) | Owner does extensive historical analysis |
| **Admin-created accounts** | No self-registration; admin/payroll creates user accounts | Tight control over who has access |
| **Sage Intacct batching** | Monthly, manually triggered by admin | Grace period needed for late submissions; admin controls timing |
| **CoAdvantage export** | Excel export summarized by employee and reimbursable amount | Manual copy-paste workflow is acceptable for now |

## MVP Scope

### In Scope (v1)

1. **Employee Receipt Library**
   - Mobile camera capture and photo upload
   - Auto-compress/optimize uploaded photos
   - OCR scanning to auto-populate: vendor name, date, amount
   - Receipt status indicators: Unreported, Submitted, Approved, Rejected, Needs Clarification, Paid/Reimbursed
   - Employee can delete or edit unreported receipts
   - No editing after manager approval

2. **Expense Report Creation & Submission**
   - "Start Expense Report" from dashboard
   - Select receipts from library to include in report
   - Each receipt becomes a line item with: date, vendor, category, amount, payment method, reimbursable amount
   - Multiple reports per month allowed (but most employees submit once)
   - Once a receipt is added to a report, it's marked as "Reported"

3. **Manager Approval Workflow**
   - Pending approvals queue on manager dashboard
   - Line-by-line approve/reject/request-more-info
   - Rejected items return to employee's library as "Unreported" with "Needs Clarification" flag
   - Manager can submit their own expenses (routes directly to admin)
   - Real-time notifications for new submissions (with option to enable/disable)

4. **Admin Dashboard**
   - View all submissions across all employees and departments
   - Final approval and override capabilities
   - Change statuses on any expense
   - Add notes to any expense
   - Full audit trail: who approved/edited, timestamps for upload, submission, approval
   - User management: add/edit users, set departments/locations
   - Category management: add/remove expense categories
   - Set approval rules

5. **Violation Warning System**
   - $400 combined monthly limit for Gas/Fuel + EV Charging (calendar month)
   - Missing receipt warning for gas expenses
   - Missing digital receipt/confirmation for EV charging
   - Missing toll breakdown for toll expenses
   - Duplicate expense detection (submitted expenses only)
   - Expenses submitted 30+ days after incurred date
   - Warnings visible to employee, manager, and payroll — never blocking

6. **Reporting & Export**
   - Filter/search by: employee, location/sales team, category, date range, approval status, payment/reimbursement status
   - Excel/CSV export
   - CoAdvantage export: summarized by employee and reimbursable amount since last export
   - Export audit trail (what was exported, when, by whom)

7. **Status Tracking**
   - Full status lifecycle: Uploaded → Unreported → Submitted → Approved/Rejected/Needs More Info → Paid/Reimbursed → Exported
   - Status visible to all relevant parties

8. **Notifications**
   - Manager notified when expense report submitted
   - Employee notified when expense approved/rejected
   - Admin notified when expenses ready for payroll
   - Configurable notification preferences

### Explicitly Out of Scope (v1)

- Sage Intacct integration (future — GL account mapping not yet determined)
- CoAdvantage API integration (future — capabilities unknown)
- Advanced fake receipt detection / vendor database cross-referencing
- Trend analysis and pattern detection
- EZPass route matching to appointment locations
- Offline receipt capture with queue-for-upload
- SMS/text-based approval for managers
- Auto-approval of routine expenses
- Multi-department rollout (architecture supports it, but v1 is sales only)
- SSO / enterprise authentication (TBD)
- Email reminder system

## Data Model

### Core Objects

**User** (confirmed concept)
- `id` — unique identifier
- `name` — employee full name
- `email` — for login and notifications
- `role` — enum: `employee`, `manager`, `admin` (possibly `executive` for read-only)
- `department` — FK to Department
- `manager_id` — FK to User (self-referential; who this user reports to)
- `is_active` — boolean
- `created_at`, `updated_at` — timestamps
- `created_by` — FK to User (admin who created the account)

**Department** (confirmed concept)
- `id`
- `name` — e.g., "CT Sales", "MA/RI Sales"
- `is_active` — boolean (supports future additions)

**Receipt** (confirmed concept — the atomic unit of the system)
- `id`
- `user_id` — FK to User (who uploaded it)
- `image_url` — path to stored receipt image (compressed)
- `original_image_url` — path to original uncompressed image (for audit)
- `ocr_raw_data` — JSON blob of raw OCR output
- `vendor_name` — extracted or manually entered
- `expense_date` — date on the receipt (extracted or manual)
- `amount` — total amount on receipt
- `status` — enum: `unreported`, `submitted`, `approved`, `rejected`, `needs_clarification`, `paid`, `exported`
- `needs_clarification` — boolean flag (set when manager rejects for more info)
- `clarification_notes` — text from manager explaining what's needed
- `uploaded_at` — timestamp of initial upload
- `category` — FK to ExpenseCategory (may be set at upload or report creation)
- `payment_method` — enum: `company_card`, `personal` (assumed field names)
- `reimbursable_amount` — decimal (may differ from receipt amount)
- `is_reimbursable` — boolean (employee confirms, especially for EZPass mixed statements)

**ExpenseReport** (confirmed concept)
- `id`
- `user_id` — FK to User (who submitted)
- `title` — optional report name (e.g., "January 2024 Expenses")
- `submitted_at` — timestamp
- `status` — enum: `draft`, `submitted`, `manager_approved`, `manager_rejected`, `admin_approved`, `admin_rejected`, `paid`, `exported`
- `total_amount` — calculated sum of included receipts
- `total_reimbursable` — calculated sum of reimbursable amounts
- `created_at`, `updated_at`

**ExpenseReportItem** (join between Report and Receipt — confirmed concept)
- `id`
- `expense_report_id` — FK to ExpenseReport
- `receipt_id` — FK to Receipt
- `line_item_status` — enum: `pending`, `approved`, `rejected`, `needs_clarification` (independent of report-level status)
- `order` — display order within report

**Approval** (audit record — confirmed concept)
- `id`
- `expense_report_id` — FK to ExpenseReport (for report-level actions)
- `expense_report_item_id` — FK to ExpenseReportItem (nullable, for line-item actions)
- `approver_id` — FK to User
- `action` — enum: `approved`, `rejected`, `requested_info`, `status_change`, `note_added`
- `notes` — text
- `previous_status` — what it was before
- `new_status` — what it changed to
- `created_at` — timestamp

**ExpenseCategory** (confirmed concept)
- `id`
- `name` — e.g., "Gas/Fuel", "Tolls", "Electric Vehicle Charging", "Miscellaneous Expenses", "Team Outings/Meals"
- `receipt_required` — boolean (true for gas)
- `digital_receipt_required` — boolean (true for EV charging)
- `breakdown_required` — boolean (true for tolls)
- `is_fuel_category` — boolean (true for Gas/Fuel and EV Charging — counts toward $400 limit)
- `is_active` — boolean
- `department_id` — FK to Department (nullable; future use for department-specific categories)

**PolicyRule** (confirmed concept)
- `id`
- `rule_type` — enum: `monthly_limit`, `receipt_required`, `submission_deadline`, etc.
- `category_ids` — array of applicable category IDs (e.g., Gas + EV for the $400 limit)
- `threshold_amount` — decimal (e.g., 400.00)
- `threshold_days` — integer (e.g., 30 for late submission warning)
- `warning_message` — text shown to user
- `is_active` — boolean

**ExportLog** (confirmed concept)
- `id`
- `exported_by` — FK to User
- `export_type` — enum: `coadvantage`, `sage`, `general`
- `exported_at` — timestamp
- `date_range_start`, `date_range_end` — what period was covered
- `expense_report_ids` — array of included report IDs
- `file_url` — path to exported file
- `notes`

**Notification** (confirmed concept)
- `id`
- `user_id` — FK to User (recipient)
- `type` — enum: `expense_submitted`, `expense_approved`, `expense_rejected`, `ready_for_payroll`, `violation_warning`
- `message` — text
- `is_read` — boolean
- `related_expense_report_id` — FK (nullable)
- `created_at`

**NotificationPreference** (confirmed concept)
- `id`
- `user_id` — FK to User
- `notification_type` — enum matching Notification types
- `enabled` — boolean
- `delivery_method` — enum: `in_app`, `email`, `both`

### Key Relationships

```
User → Department (many-to-one)
User → User (employee reports to manager; self-referential)
User → Receipt (one-to-many; employee uploads receipts)
Receipt → ExpenseReportItem → ExpenseReport (many-to-many through join)
ExpenseReport → User (submitted by)
ExpenseReport → Approval (one-to-many; audit history)
ExpenseReportItem → Approval (one-to-many; line-item audit history)
ExpenseCategory → Receipt (one-to-many)
ExportLog → ExpenseReport (many-to-many; tracks what was exported)
```

### EZPass Statement Handling

EZPass statements are a special case. A single uploaded document may contain multiple toll transactions plus payment/credit lines. The system should:
1. OCR the statement and attempt to auto-categorize each line (toll vs payment vs credit)
2. Present the parsed lines to the employee for confirmation
3. Employee marks which tolls are reimbursable (some may be personal trips)
4. Each confirmed toll becomes its own Receipt record linked to the original upload
5. Payment amounts and credits are excluded from reimbursement

## Fields & API Names to Confirm

Before going to production, the following must be verified against real-world data and systems:

- [ ] Sage Intacct GL account codes for each expense category (Gas/Fuel → ?, Tolls → ?, EV Charging → ?, Misc → ?, Team Meals → ?)
- [ ] Sage Intacct API authentication method and required credentials
- [ ] Sage Intacct entity/dimension structure (departments, projects, employees)
- [ ] CoAdvantage employee ID format (what uniquely identifies an employee in their system)
- [ ] CoAdvantage expected Excel column format for reimbursement uploads
- [ ] CoAdvantage pay period dates/cadence
- [ ] Whether CoAdvantage has an API (currently assumed no — file upload only)
- [ ] OCR service provider selection (Google Cloud Vision, AWS Textract, or other)
- [ ] Exact department names and IDs (currently assumed: "CT Sales", "MA/RI Sales")
- [ ] User authentication approach (local accounts with admin-created credentials, or SSO)
- [ ] Company branding assets (Venture Home Solar logo, brand colors — current prototype uses dark theme with gold accent `#F0A830