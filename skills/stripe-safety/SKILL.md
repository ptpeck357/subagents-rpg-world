# Stripe Safety Skill

## Trigger

Auto-invoke when creating or modifying any Stripe-related code.

## Steps

1. Verify secret key is never used client-side
2. Check idempotency key present on POST requests
3. Confirm amount comes from server not client request body
4. Check webhook signature verification present
