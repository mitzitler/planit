# Testing Planit

Planit is tested in three layers. Each layer is cheaper and faster than the one after it:

| Layer | Command | Calls the real model? | Cost | Time |
|---|---|---|---|---|
| Unit tests | `npm test` | No (fake model) | Free | A few seconds |
| Smoke run | `npx tsx --env-file=.env.local scripts/agent-smoke.mts "..."` | Yes, one turn | A few cents | About 10 s |
| Agent eval | `npm run eval` | Yes, 12 scripted cases | About $0.65 | About 30 s |

The unit tests check that the code is correct. The eval checks that the agent behaves well. A model's answers vary from run to run, so the eval can't be an ordinary unit test. It runs on demand, not on every change.

## 1. Unit tests (Vitest)

```bash
npm test        # same as ng test
```

Angular runs the tests with Vitest in JSDOM. The planning logic is plain TypeScript, so most tests need no Angular setup or browser.

| File | Tests | What it covers |
|---|---|---|
| `src/app/shared/plan.spec.ts` | 26 | The 7 tools in `applyTool`: every input is validated, ids must be selectable, and guest ranges, clashes, formality, budget estimates and index-based removal all work. |
| `src/app/shared/agent.spec.ts` | 10 | The agent loop in `runAgent`, run against a **fake model** (see below), plus checks on the system prompt. |
| `src/app/shared/format.spec.ts` | 2 | Display formatting: `19:00` → `7pm`, and money ranges like `$12.50–1,200`. |
| `src/app/app.spec.ts` | 1 | The app component is created. |

### The fake model

`runAgent` takes the model call as a parameter (`callModel`) instead of creating its own Anthropic client. In production, `api/agent.ts` passes in the real Claude call. The tests pass in a function that returns scripted responses. This lets them test the hard parts of the loop without network calls or spend:
- tool calls are applied and plan updates are streamed
- an invalid id goes back to the model as an error, and the plan is unchanged
- the 6-round cap holds even if the model keeps calling tools
- a guest clash is reported in the tool result
- a refused turn or one cut off at `max_tokens` is dropped, so the saved history stays valid
- earlier history is sent back unchanged
- the system prompt lists every selectable place, activity and formality level

## 2. Smoke run (one real turn)

```bash
npx tsx --env-file=.env.local scripts/agent-smoke.mts "Birthday for 12 at my place, board games, \$300"
PLAN='{"places":["home-my"]}' npx tsx --env-file=.env.local scripts/agent-smoke.mts "Add video games too"
```

Runs one real agent turn from the terminal and prints the reply, each round's stop reason and token usage, the final plan, and an upper bound on the cost. It skips Supabase and the browser. Use it to try a prompt change by hand before running the full eval.

Needs `ANTHROPIC_API_KEY` in `.env.local`.

## 3. Agent eval (12 scripted cases)

```bash
npm run eval                              # all 12 cases
npm run eval -- guest-clash tight-budget  # only these cases
npm run eval -- --dry                     # no model, free: checks the checks
```

`scripts/agent-eval.mts` sends one message per case to the real model with the real tools. Some cases start from a prepared plan. The script then checks the resulting plan and the reply text. It runs 3 cases at a time, prints the failures with the reply and the plan, and ends with a summary:

```
12/12 passed · 38 tool calls · cost <= $0.65
```

It exits with code 1 if any case fails.

### The cases

| Case | Starting plan | Message | Passes if |
|---|---|---|---|
| `birthday-board-games` | Empty | Birthday for 12 at my place, board games, $300 | 12 guests, `cozy`, `home-my`, board games and birthday, $300 total, items within $300 |
| `park-picnic` | Empty | A picnic in a city park for about 30 | `park-city`, picnicking, 30 guests, `mixer` |
| `guest-range` | Empty | Pizza party, maybe 8 to 12 people | Saved as min 8 / max 12, plans for 12, takeout, pizza as a low–high estimate |
| `relative-date` | Empty | Game night next Friday at 7pm | Date is Oct 30 or Nov 6, 7pm on the schedule, a Playing activity, `intimate` |
| `guest-clash` | 15 preferred, at home | 19 people have already said yes | Plans for 19 or more, keeps the 15, mentions the clash |
| `formality-guess` | Empty | Wine and cheese night for 10 | Saves an unconfirmed guess and asks about it |
| `formality-confirm` | Unconfirmed `casual` | More like a cocktail party | Saved as `dressy`, confirmed |
| `drop-budget-item` | Pizza, decorations, plates | Drop the decorations | Decorations gone, the other two kept |
| `move-schedule-item` | 6pm setup, 7pm dinner | Move dinner to 8pm | Dinner at 8pm, nothing at 7pm, setup unchanged |
| `keep-existing-choices` | Home, board games | Add video games too | Video games added, existing choices kept |
| `no-matching-place` | Empty | Let's have it on a yacht | No place picked, and the reply mentions the yacht |
| `tight-budget` | Empty | Catered dinner for 40 on $200 | Items stay within $200, or the reply warns |

Every reply is also checked against the system prompt's rules. The reply is not empty and asks at most two questions. It has no markdown and no emoji. The turn must also end normally (`end_turn`), not at the round or token cap.

### How it's designed

- **The date is fixed.** `TODAY` is Wed 2026-10-28, so "next Friday" has a known answer.
- **Checks look at outcomes, not wording.** They check the saved plan, plus a few keywords in the reply. Exact sentences change from run to run, but "plans for 19 or more guests" shouldn't.
- **Some checks accept more than one answer.** "Next Friday" could mean Oct 30 or Nov 6, and a tight budget can be met or flagged. The eval doesn't fail the agent for a reasonable reading.
- **`--dry` checks the checks.** It runs each case's checks against its starting plan, without the model. Every case should fail there. A case that passes without the model has checks that prove nothing. Dry mode skips the reply rules, because an empty reply fails those in every case.
- **One source for the request.** The eval and smoke scripts get the Claude call from `scripts/claude.mts`: same model, effort, tools and system prompt as `api/agent.ts`. The scripts test the same request production sends.
- **The cost is an upper bound.** It prices all input at $4/M and output at $20/M. Cached input actually costs less.

### Adding a case

Add an entry to `CASES` in `scripts/agent-eval.mts`:

```ts
{
  name: 'my-case',
  start: [['set_basics', { name: 'Game night', budgetTotal: 200 }]], // optional, applied with applyTool
  message: 'What the user types',
  checks: [
    ['plans for 8 guests', plan => plan.guestCount === 8],
    ['mentions parking', (_, reply) => /parking/i.test(reply)],
  ],
},
```

Then run `npm run eval -- --dry` to confirm it fails without the model, and `npm run eval -- my-case` to run it for real.

### Results

| Date | Result | Tool calls | Cost |
|---|---|---|---|
| 2026-10-28 | 12/12 | 38 | ≤ $0.65 |

A single run can be lucky. Run it two or three times after a prompt change, and record the lowest score.

## Testing by hand

The unit tests and the eval don't touch the UI, Supabase or the Vercel function. After a UI or API change, check it in the browser:
- **Local:** `ng serve`. `/api/agent` only runs on Vercel, so the chat panel needs the preview deployment.
- **Preview:** each push to `feat/agent` deploys to the Vercel preview URL (behind Vercel login).
- **Run log:** every agent run on the server writes a row to the `agent_runs` table in Supabase, with tokens, tool calls, stop reason, latency and any error. Check there when a run behaves oddly.
