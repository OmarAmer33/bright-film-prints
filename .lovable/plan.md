Display-only polish to the reward-earned callout on the order-summary page.

Technical change
1. src/routes/orders.$token.tsx
   - Import `Sparkles` from `lucide-react`.
   - Replace the existing muted `You earned ... in rewards on this order.` paragraph (the one rendered when `order.rewards_earned > 0` right after the `Total` row) with a styled callout:
     - A `div` with `mt-4 flex items-center gap-2.5 rounded-card border border-gold/50 bg-dawn px-4 py-3`.
     - A `Sparkles` icon on the left (`h-5 w-5 shrink-0 text-sun`, `aria-hidden`).
     - A paragraph with `text-sm font-medium text-ink` containing the text "You earned ${amount} in rewards toward your next order".
     - The amount is wrapped in a `span` with `font-mono font-bold text-gradient-accent bg-clip-text text-transparent`. The project already exposes the `text-gradient-accent` utility for the sun→ember gradient, so the inline style is not needed.
   - Keep the conditional `order.rewards_earned > 0` wrapper and the same position in the totals block.
   - Leave the Rewards row and every other element on the page untouched.

Verification
- Build the app to confirm the new import and JSX compile.
- Publish the current project.

Out of scope
- No other files, data, money logic, RPC, checkout, webhook, pricing, or reconciliation changes.