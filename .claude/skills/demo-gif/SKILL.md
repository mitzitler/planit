---
name: demo-gif
description: Retake the README's agent demo GIF (docs/agent-demo.gif) on the Vercel preview with Claude in Chrome. Use when the user asks to retake, re-record or refresh the demo GIF, usually after UI polish.
---

# Retake the agent demo GIF

Records the same demo every time, so the GIF only changes when the UI does: a new event named
"Sam's birthday", one prompt to the assistant, and the Plan card filling in as the reply streams.

Each take makes one real agent run (a few cents, and 1 of the demo account's 20 runs per day).

## Before recording

1. **The UI changes must be deployed.** The agent only runs on Vercel (`ng serve` has no `/api/agent`).
   Check that the branch is pushed and the latest commit's deploy succeeded:
   `gh api repos/mitzitler/planit/commits/$(git rev-parse HEAD)/statuses --jq '.[0].state'` should print `success`.
   If there are unpushed UI changes, ask the user before committing or pushing.
2. Load the Claude in Chrome tools in one ToolSearch call: `tabs_context_mcp`, `tabs_create_mcp`,
   `tabs_close_mcp`, `navigate`, `computer`, `find`, `resize_window`, `browser_batch`, `gif_creator`.
3. Call `tabs_context_mcp` (createIfEmpty), work in a new tab, and `resize_window` to **1280×800**
   so takes are the same size.
4. Open https://planit-git-feat-agent-mitzis-projects-82f79b8e.vercel.app/dashboard (after the merge to
   `main`, use the production URL instead). The user must be logged in as the demo account; if the page
   shows Log in, stop and ask them to log in. Never type the password.
5. If a "Sam's birthday" event from an earlier take is on the dashboard, delete it first (its Delete
   button opens an in-page `<dialog>`, not a browser alert, so it's safe to click).

## Recording

6. Click **Create event**, type `Sam's birthday`, press Enter. Wait for Mission Control to load and
   take a screenshot to find the chat box.
7. In one `browser_batch`:
   - `gif_creator` start_recording, then two screenshots (opening frames)
   - click the chat box, type `Birthday for 12 at my place, board games, $300 budget`, screenshot
   - press Enter, then alternate `wait` 2–4 s and a screenshot until about 15 s have passed
     (screenshots can use `scale: 0.3`; the GIF still uses full-size frames)
   - one full-size screenshot to confirm the run finished: the reply ends and the Plan card shows
     guests, places, activities and budget items
8. If the reply is an error (for example the daily limit or "The assistant is unavailable"), clear the
   recording (`gif_creator` clear), tell the user, and stop.
9. Two more screenshots (closing frames), `stop_recording`, then `export` with `download: true`,
   `filename: "agent-demo.gif"`, and `options: { showProgressBar: false, showWatermark: false }`.

## After recording

10. Move the download into the repo, replacing the old GIF:
    `mv ~/Downloads/agent-demo.gif docs/agent-demo.gif`
    (if Chrome saved it as `agent-demo (1).gif`, move that one and delete the leftovers).
11. Look at it with the Read tool and check the size with `ls -la` (it was 1.4 MB; keep it under about
    3 MB so the README loads quickly).
12. Delete the "Sam's birthday" event from the dashboard so the demo account stays clean, then close
    the tab.
13. Report what the agent did in the take (guests, places, activities, budget total) and ask before
    committing. Suggested commit message: `Retake the agent demo GIF`.
