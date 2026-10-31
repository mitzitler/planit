# Live Google Calendar sync (in progress)

Planit can already put a plan on the host's calendar two ways (see the README's Calendar section): a one-time `.ics` download, and a subscribed feed that Google refreshes every 12 to 24 hours. Live sync is the third: the host connects their Google account once, and every change to the plan shows on their Google Calendar within seconds.

It's for the host's own calendar only. It doesn't send invites to guests.

## How it would work

1. **Connect.** On the Calendar tab, the host clicks "Connect Google Calendar" and approves Google's consent screen. Planit asks only for permission to manage calendars it creates (the `calendar.app.created` scope; confirm it in Google's scope list when setting up the OAuth client), not to read the host's other events.
2. **A Planit calendar.** Planit creates one secondary calendar in the host's account, "Planit", and puts every connected event in it, so the host can hide or colour it like any other calendar.
3. **Sync on save.** After every plan save, from the assistant (`api/agent.ts`) or a hand edit, a sync step compares the plan's entries with what it last wrote to Google and sends only the differences: insert, update or delete. The entries are the same ones the `.ics` download and feed use (`calendarEntries` in `src/app/shared/ics.ts`), and their stable IDs are the key.
4. **Disconnect.** "Disconnect" revokes the token and deletes the Planit calendar. If the host revokes access from their Google account instead, the next sync notices and shows "Reconnect".

## What it needs

| Piece | Where | Status |
|---|---|---|
| Turning plan entries into Google event bodies, and working out the inserts, updates and deletes | `src/app/shared/google-calendar.ts` | Built, with unit tests, on `feat/google-calendar` |
| A Google Cloud project with the Calendar API on, and an OAuth client | Google Cloud console | Not started |
| Sign-in with calendar access, and storing the refresh token encrypted | A new `calendar_connections` table, written only by the server | Not started |
| The sync step: a Vercel function called after each save | `api/google-sync.ts` | Not started |
| Connect, disconnect and reconnect on the Calendar tab | `calendar-tool` | Not started |
| Google's verification of the app | Google | Not started |

## Why it isn't live yet

Even the narrowest calendar permission counts as **sensitive**. Until Google verifies the app:
- only test users added by hand in the Google Cloud console, at most 100, can connect
- they see an "unverified app" warning first

Verification needs a privacy policy, a short demo video of the consent flow, and Google's review, which takes days to weeks. The plan is to build and test it with a few test users, then apply for verification.

## Why the feed comes first

The subscribed feed covers most of the need today: it works with every calendar app, needs no Google account, and needs no review. Live sync only adds speed in Google Calendar, so it's worth finishing once real hosts say the 12 to 24 hour delay matters.
