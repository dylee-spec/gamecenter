# 함께 두는 오목

`index.html` is a dependency-free HTML/CSS/JavaScript client. It uses the existing free Supabase project; no paid service or subscription was added.

## Rules and behavior

- 15 × 15 freestyle Gomoku. Black starts; five or more wins. No forbidden moves.
- Nickname (1–12 characters), titled public/password rooms, two player seats and up to 32 total members.
- Passwords protect spectator entry as well as player entry. Use a game-only password.
- Each browser tab has a random 256-bit capability in sessionStorage. Nicknames are display names, not verified identities.
- Room views synchronize every 1.5 seconds, lobby every 10 seconds, background tabs every 5 seconds. This is polling, not WebSocket Realtime.
- Joining never starts a match. Only the host can start/restart, and two occupied seats are required. Each restart creates a new round and clears the board. Stale-round moves and duplicate starts are rejected.
- Win/loss dialogs are shown once per round. Per-member results survive a restart so the other player does not miss the previous result.
- Leaving before start has no winner. Leaving during a match immediately forfeits on the server; remaining clients learn through their next poll. `pagehide` sends a best-effort keepalive departure on reload/navigation/close. Browsers cannot guarantee this on process kills or network outages. Missing heartbeats are detected after 30 seconds on a subsequent room/lobby request; there is no additional reconnection grace period. Browser background throttling may delay heartbeats.
- Rooms stay open while any player or spectator remains. On host departure, a remaining player is preferred, then the earliest spectator. Seats are freed without moving the remaining player's color. The host can restart when both seats are occupied. Empty rooms are marked closed, not deleted. No fixed room lifetime.
- Room chat is available to players and spectators, password/membership protected, plain text only. Max 300 characters, one message per second per member, rolling last 50 messages. Polls request incremental chat messages.

## Backend

For a fresh install, apply `schema.sql` then `upgrade-v2.sql`. For the existing installation, apply only `upgrade-v2.sql`. The scripts use isolated private tables and the `public.gomoku_api` RPC. They do not modify UDM rankings. No table grants or private token/password hashes are exposed to clients. The publishable key in HTML is intentionally public, not a service role key. The current RPC requires `p_data.client = '2'`; older clients get an update/reload message.

The security-definer RPC has an empty search path and explicit schema qualification. Room row locks serialize joins, starts, moves, chat and departures. Server validates membership, host permission, passwords, seats, round numbers, turns, occupied cells and wins. Tokens are stored hashed; room passwords use SHA-256 then salted bcrypt. Failed-password attempts are limited per session. A session may only be in one open room. Limits: 100 open rooms and 50,000 anonymous sessions.

Anonymous public hosting cannot fully prevent bots creating new sessions. This small-community implementation is not an abuse-proof competitive service. Review usage periodically; never upgrade billing automatically. Old game records are not automatically deleted. Add an explicitly authorized retention/abuse-control policy if traffic grows.

## Verification

V2 API tests cover host-only start/restart, no pregame win, host transfer, concurrent start exclusion, chat privacy/sync/rate limiting, spectator move rejection, immediate departure outcomes, clearing the board on restart, stale-round rejection, results retained across restart, spectator-only room persistence, and closure only when empty. Browser tests cover start, chat, alternating moves, both outcome dialogs, restart and host departure. V1 rules tests covered horizontal/vertical/both diagonal/overline wins.
