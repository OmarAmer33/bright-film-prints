# Rewrite /about with Chai's real story

## Scope
**Single file:** `src/routes/about.tsx`. No other files touched.

## Preserve (unchanged)
- `<Sunburst>` motif + positioning
- "About" eyebrow (`font-mono text-xs uppercase tracking-[0.22em] text-ember`)
- H1: "Built by printers, for printers."
- Page shell, `<SiteHeader>`, `<SiteFooter>`, `<main>` structure
- "See how it works" CTA `<Link to="/how-it-works">`
- Existing class conventions (rounded-card, border-line, shadow-warm/40, text-ink/70, etc.)

## Changes

### 1. head() meta — update both description fields
- `name="description"` → "Bright Transfers is Chai Footman's DTF gang-sheet shop in South Florida — a printer's printer built on quality, fast turnaround, and fair prices."
- `property="og:description"` → same string.
- `og:title` stays "About — Bright Transfers"; `title` stays "About — Bright Transfers".

### 2. Delete the draft callout div
Remove the entire block:
```tsx
<div className="mt-6 rounded-card border border-line bg-dawn p-4 text-sm text-ink/70">
  Draft brand story — to confirm and personalize with Chai.
</div>
```

### 3. Replace the three body paragraphs
In the `mt-8 space-y-5 text-lg text-ink/70` block, swap the three `<p>` elements for these four (same wrapper/classes):

1. "I'm Chai — the printer behind Bright Transfers. I grew up around this work: my dad was a graphic designer back in the early '80s, the guy a lot of South Florida businesses — especially minority-owned ones — went to when they needed their brand done right. That world was in the house long before it became mine."

2. "I spent twenty years as a firefighter. When I finally built something of my own, I went back to what I knew — I bought a retiring family friend's manual screen press, found a dryer at a local church, and started printing shirts one at a time. My first-ever online customer took a chance on a stranger; that first job took me eight hours, and I made sure every bit of it was right. She's been like family ever since."

3. "I ran that manual press for more than ten years, moved to automatic, and in 2019 switched to DTF printing — and I haven't looked back. I still run Complete Print for the shirt side. Bright Transfers is where the focus lives now: gang sheets, done right."

4. "I fell in love with gang sheets because the work is cleaner and the people are my people — other printers who know the industry and speak the language. I know what you're up against: the rush orders, the last-minute changes, the customer who needed it yesterday. So I built Bright Transfers to be the opposite of corporate and cookie-cutter. Call it the printer's printer."

### 4. Replace the `values` array
```tsx
const values = [
  { title: "Fast turnaround", body: "I want your film in your hands as fast as I can get it there. Speed isn't a feature here — it's the point." },
  { title: "Color that's exactly right", body: "The small details are the whole job. Your prints come out the way you meant them to, every time." },
  { title: "A real person behind it", body: "Pro or first-timer, you're dealing with someone who actually prints — and cares that it's right." },
];
```
The cards render loop (`.map`) and card markup stay identical — only array contents change.

### 5. Add a closing paragraph
After the value-cards grid `</div>` and before the CTA `<div className="mt-10">`, insert:
```tsx
<div className="mt-10">
  <p className="text-lg text-ink/70">
    From family reunions to a 16,000-shirt run for a voting-rights nonprofit, I've built my name over ten-plus years the honest way: word of mouth. Twenty years of fire service, father of three, and still obsessed with getting your order right.
  </p>
</div>
```
(Styled `text-lg text-ink/70`, matching the body paragraphs' treatment. Wrapped in its own `mt-10` div to match the existing spacing rhythm between the grid and CTA sections.)

## Not touched
- Any other route or component
- The Sunburst, eyebrow, H1, CTA, or shell
- `og:title` / `title` meta values
