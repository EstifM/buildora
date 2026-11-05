# Phase 4 – Payment Popup + Telegram Bot (Manual Approval)

## Goal
Implement a clean payment popup and a Telegram bot that works with manual approval by the admin (Estifanos).

## Payment Popup Design
- Triggered when user needs to unlock (AI Builder or unlimited access)
- Two-column layout on desktop (stacked on mobile)

### Left Column – Payment Details
- Title: Payment Details
- Telebirr Number: +251921457288
- Account Name: Estifanos
- Two plan buttons:
  - 50 ETB – 1 Day Unlimited
  - 200 ETB – 7 Days Unlimited
- Clearly show the selected amount

### Right Column – Confirm Payment
- Title: Confirm Your Payment
- Input: Payment Reference / Transaction Number
- Helper text: “Enter the reference/transaction number from your payment receipt”
- Button: Confirm Payment

## After user clicks Confirm Payment
1. Validate the Transaction ID (not empty, reasonable length)
2. Send the Transaction ID + user email + selected plan to the Telegram bot
3. Show the user a “Waiting for confirmation…” state
4. The Telegram bot notifies the admin (you) with Approve / Reject buttons
5. When admin clicks Approve:
   - Activate the user’s account for 1 or 7 days
   - Notify the user on the website that payment was successful
6. When admin clicks Reject:
   - Notify the user that the payment was not approved

## Technical Requirements
- Telegram bot must run on Cloudflare Workers (webhook mode)
- Store every Transaction ID permanently so it can never be reused
- If a Transaction ID is used again → show clear error
- All user-facing text must go into en.json
- Keep the UI simple and clean
- Follow all security rules in CLAUDE.md

## Out of scope for now
- Automatic verification of Telebirr receipts
- Real AI Builder
- File storage on R2