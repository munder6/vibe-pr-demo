# Vibe PR Demo

A tiny shop used to prove Vibe Test's *Test PR before merge*. Published on GitHub Pages from `main`; `npm start` serves the same files locally.

## Sign in

`npm start` also serves a sign-in page (`/login`) and the account page (`/account`). Users are kept in
`data/users.json`, which a fresh checkout does not have; create one with
`node scripts/create-user.js <email> <password> [role]`.
