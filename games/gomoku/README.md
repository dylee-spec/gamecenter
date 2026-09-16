# 함께 두는 오목

`index.html` is a dependency-free HTML/CSS/JavaScript client. It uses the existing free Supabase project; no paid service or subscription was added.

## Rules and behavior

- 15 × 15 freestyle Gomoku. Black starts; five or more wins. No forbidden moves.
- Nickname (1–12 characters), titled public/password rooms, two players, up to 30 spectators.
- Passwords protect spectator entry as well as player entry. Use a game-only password.
- Each browser tab has a random 256-bit capability in sessionStorage. Reloading the same tab can resume; closing the tab may lose access. Nicknames are display names, not verified identities.
- Active players synchronize every 1.5 seconds, spectators every 3 seconds, lobby every 10 seconds. Background tabs poll every 15 seconds. This is polling, not WebSocket Realtime.
- Explicit departure forfeits an active game. Loss of heartbeat gives a 90-second grace period, resolved by the next room request. Rooms expire after 6 hours. Finished rooms are hidden from the lobby; create a new room for another match.

## Backend

`schema.sql` creates isolated private tables and the `public.gomoku_api` RPC. It does not modify UDM rankings. No table grants or private token/password hashes are exposed to clients. The publishable key in HTML is intentionally public, not a service role key.

The security-definer RPC has an empty search path and explicit schema qualification. Room row locks serialize joins and moves. Server validates membership, passwords, seats, turns, occupied cells and wins. Tokens are stored hashed; room passwords use SHA-256 then salted bcrypt. Failed-password attempts are limited per session. A session may only play in one open room. Limits: 100 recent open rooms and 50,000 anonymous sessions.

Anonymous public hosting cannot fully prevent bots creating new sessions. This small-community implementation is not an abuse-proof competitive service. Review usage periodically; never upgrade billing automatically. Old game records are not automatically deleted. Add an explicitly authorized retention/abuse-control policy if traffic grows.

## Verification

Tested API password rejection, unauthorized state access, concurrent seat claims, spectator/turn enforcement, occupied cells, five-stone victory, terminal game lock and private schema access. Browser-tested two separate player tabs, a spectator tab, reload recovery, synchronized moves, forfeit, and 390px mobile layout.
