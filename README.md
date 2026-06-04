# Venture Home Expense Prototype

GitHub-ready React/Vite frontend prototype for the Venture Home expense reimbursement platform.

## What this includes

- Employee, Manager, and Payroll/Admin prototype views
- Receipt Library
- Upload + autoscan simulation
- Create Expense Report from unreported/rejected receipts
- Manager approval queue
- Payroll review queue
- Awaiting reimbursement tab
- Bulk mark reimbursed
- Receipt preview modal
- Receipt-level rejection note workflow
- Custom CSV/export field builder
- Invite Users admin prototype
- Users & Settings placeholder
- Audit Trail
- Developer Setup blueprint

## Important

This is a frontend prototype only.

Not connected yet:
- Real authentication
- Real database
- Real receipt file storage
- Real OCR/autoscan
- Real email notifications
- Real payroll/CoAdvantage Quantum integration
- Real audit logging backend

## Run locally

```bash
npm install
npm run dev
```

Then open the local Vite URL.

## Production notes

The role toggle is for prototype/demo only. In production, the user role should come from authentication and permissions.
