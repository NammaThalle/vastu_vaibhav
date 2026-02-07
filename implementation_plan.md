# Implementation Plan - Vastu Vaibhav (Phase 5)

## Phase 5: Ledger & Payments

### Backend
- **Models**: `ServiceEntry`, `Payment`.
- **API**: `/api/v1/ledger/` endpoints for credits and debits.
- **Logic**: Dynamic balance calculation per client.

### Frontend
- **Transactions**: UI for adding extra charges or payments.
- **Ledger Table**: Chronological list of all financial events.
- **Balance Display**: Real-time balance on Client View and Dashboard.
