# EventEase (MERN)

Local event organizer: auth, events, RSVP (approval / waitlist), real-time chat, feedback, QR sharing, and admin dashboard.

## Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)

## Environment

### Backend (`backend/.env`)

Copy from `backend/.env.example` and fill in:

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Strong secret for JWT |
| `PORT` | API port (default `5000`) |
| `FRONTEND_URL` | Allowed CORS origin, e.g. `http://localhost:3000` |
| `INITIAL_ADMIN_EMAIL` | Optional: first registration with this email gets `role: admin` |

### Frontend (`frontend/.env`)

| Variable | Description |
|----------|-------------|
| `REACT_APP_API_URL` | API base, e.g. `http://localhost:5000/api` (dev default in code if unset) |

## Run locally

```bash
# Terminal 1 — API
cd backend
npm install
npm run dev

# Terminal 2 — React app
cd frontend
npm install
npm start
```

- App: `http://localhost:3000`
- API: `http://localhost:5000`
- Socket.io uses the same host as the API (see `frontend/src/contexts/SocketContext.js`).

## Roles

| Role | Meaning |
|------|---------|
| `user` | Default. Can create events, RSVP, chat (when allowed), feedback, etc. |
| `admin` | Can open `/admin`: list/search users, deactivate/reactivate accounts, deactivate any event, view analytics. |

JWT does not embed role; each request loads the user from the database, so role changes apply after re-login if you edit the DB.

## Admin access (how to log in as admin)

There is **no separate admin login page**. You use the normal **Register** or **Login** with an admin account.

### Option A — first-time admin (recommended for a new database)

1. In `backend/.env`, set `INITIAL_ADMIN_EMAIL` to the **exact** email you will register (case-insensitive).
2. Start the backend, then **Register** with that email and a password.
3. That account gets `role: admin` on creation.
4. Log in → the navbar shows **Admin** → open [http://localhost:3000/admin](http://localhost:3000/admin).

If you already registered that email **before** setting `INITIAL_ADMIN_EMAIL`, that user stays `user`. Either register a different admin email, or update the user in MongoDB (`role: 'admin'`) and log in again.

### Option B — promote an existing user in MongoDB

In Atlas (or mongosh), update the user document:

```js
db.users.updateOne(
  { email: "you@example.com" },
  { $set: { role: "admin" } }
)
```

Then log out and log in again so the UI picks up `role`.

### Deactivated users

Users with `isActive: false` cannot authenticate (login and API token checks fail). Admins can reactivate users from the admin dashboard.

## API highlights

- `GET /api/events` — filters: `category`, `location`, `q`, `from`, `to`, `sort`, `limit`
- `GET /api/events/:id/share-link` — canonical event URL for QR
- `POST /api/events/cancel-rsvp` — leave RSVP / pending / waitlist
- Admin: `GET /api/admin/users`, `PATCH /api/admin/users/:id`, `GET /api/admin/events`, `DELETE /api/admin/events/:id`, `GET /api/admin/analytics`

## Security notes

- Never commit real `.env` files or database passwords.
- CORS is restricted to `FRONTEND_URL`.
- Login and register routes are rate-limited.

# cse470updated
