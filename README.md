# 🍽️ Nosh Dish Dashboard — Euphotic Labs Assignment

A full-stack dashboard to manage dish publishing status, built with **React + Flask + SQLite**.

## Features
- View all dishes with images and publish status
- Toggle publish/unpublish from the dashboard
- **Real-time updates via SSE** — if a dish is toggled from the backend directly (e.g., via curl), the dashboard updates instantly
- Filter by All / Published / Unpublished
- Optimistic UI updates with rollback on failure

---

## Tech Stack

| Layer     | Tech                        |
|-----------|-----------------------------|
| Frontend  | React.js                    |
| Backend   | Python Flask                |
| Database  | SQLite (via built-in module)|
| Real-time | Server-Sent Events (SSE)    |

---

## Project Structure

```
euphotic-dishes/
├── server/
│   └── app.py          # Flask API + SSE + SQLite
└── client/
    └── src/
        ├── App.js       # Main dashboard logic
        ├── DishCard.js  # Dish card component
        └── *.css        # Styles
```

---

## Getting Started

### 1. Backend (Flask)

```bash
cd server
pip install flask flask-cors
python app.py
```

Server runs at: `http://localhost:5000`

### 2. Frontend (React)

```bash
cd client
npm install
npm start
```

App runs at: `http://localhost:3000`

---

## API Endpoints

| Method | Endpoint                        | Description              |
|--------|---------------------------------|--------------------------|
| GET    | `/api/dishes`                   | Fetch all dishes         |
| PATCH  | `/api/dishes/:dishId/toggle`    | Toggle isPublished       |
| GET    | `/api/stream`                   | SSE stream for live updates |

---

## Real-Time Demo

To test real-time updates from the backend directly (without the dashboard):

```bash
curl -X PATCH http://localhost:5000/api/dishes/1/toggle
```

The dashboard will update instantly without a page refresh.

---

## Database Schema

```sql
CREATE TABLE dishes (
    dishId      TEXT PRIMARY KEY,
    dishName    TEXT NOT NULL,
    imageUrl    TEXT NOT NULL,
    isPublished INTEGER NOT NULL DEFAULT 1
);
```
