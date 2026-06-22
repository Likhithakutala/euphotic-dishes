import sqlite3
import json
import time
import threading
import queue
from flask import Flask, jsonify, request, Response
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DB_PATH = "dishes.db"

# SSE clients queue list
sse_clients = []
sse_lock = threading.Lock()

DISHES_DATA = [
    {"dishId": "1", "dishName": "Butter Chicken", "imageUrl": "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400", "isPublished": True},
    {"dishId": "2", "dishName": "Paneer Tikka", "imageUrl": "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400", "isPublished": True},
    {"dishId": "3", "dishName": "Dal Makhani", "imageUrl": "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400", "isPublished": False},
    {"dishId": "4", "dishName": "Biryani", "imageUrl": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400", "isPublished": True},
    {"dishId": "5", "dishName": "Masala Dosa", "imageUrl": "https://images.unsplash.com/photo-1630383249896-424e482df921?w=400", "isPublished": True},
    {"dishId": "6", "dishName": "Chole Bhature", "imageUrl": "https://images.unsplash.com/photo-1626132647523-66e2bf5b9659?w=400", "isPublished": False},
    {"dishId": "7", "dishName": "Palak Paneer", "imageUrl": "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400", "isPublished": True},
    {"dishId": "8", "dishName": "Gulab Jamun", "imageUrl": "https://images.unsplash.com/photo-1601303516534-bf6fe7012c09?w=400", "isPublished": True},
]


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS dishes (
            dishId TEXT PRIMARY KEY,
            dishName TEXT NOT NULL,
            imageUrl TEXT NOT NULL,
            isPublished INTEGER NOT NULL DEFAULT 1
        )
    """)
    # Populate only if empty
    count = conn.execute("SELECT COUNT(*) FROM dishes").fetchone()[0]
    if count == 0:
        for dish in DISHES_DATA:
            conn.execute(
                "INSERT INTO dishes (dishId, dishName, imageUrl, isPublished) VALUES (?, ?, ?, ?)",
                (dish["dishId"], dish["dishName"], dish["imageUrl"], 1 if dish["isPublished"] else 0)
            )
    conn.commit()
    conn.close()


def notify_clients(data):
    """Push update to all connected SSE clients."""
    message = f"data: {json.dumps(data)}\n\n"
    with sse_lock:
        dead = []
        for q in sse_clients:
            try:
                q.put_nowait(message)
            except Exception:
                dead.append(q)
        for q in dead:
            sse_clients.remove(q)


# ─── API Routes ───────────────────────────────────────────────

@app.route("/api/dishes", methods=["GET"])
def get_dishes():
    conn = get_db()
    rows = conn.execute("SELECT * FROM dishes").fetchall()
    conn.close()
    dishes = [
        {
            "dishId": r["dishId"],
            "dishName": r["dishName"],
            "imageUrl": r["imageUrl"],
            "isPublished": bool(r["isPublished"])
        }
        for r in rows
    ]
    return jsonify(dishes)


@app.route("/api/dishes/<dish_id>/toggle", methods=["PATCH"])
def toggle_dish(dish_id):
    conn = get_db()
    row = conn.execute("SELECT * FROM dishes WHERE dishId = ?", (dish_id,)).fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "Dish not found"}), 404

    new_status = 0 if row["isPublished"] else 1
    conn.execute("UPDATE dishes SET isPublished = ? WHERE dishId = ?", (new_status, dish_id))
    conn.commit()

    updated = {
        "dishId": row["dishId"],
        "dishName": row["dishName"],
        "imageUrl": row["imageUrl"],
        "isPublished": bool(new_status)
    }
    conn.close()

    # Notify all SSE clients
    notify_clients({"type": "TOGGLE", "dish": updated})

    return jsonify(updated)


# ─── SSE Endpoint ─────────────────────────────────────────────

@app.route("/api/stream")
def stream():
    def event_stream(q):
        # Send a heartbeat immediately so the connection is confirmed
        yield "data: {\"type\": \"connected\"}\n\n"
        while True:
            try:
                message = q.get(timeout=25)
                yield message
            except Exception:
                # Heartbeat to keep connection alive
                yield ": heartbeat\n\n"

    q = queue.Queue()
    with sse_lock:
        sse_clients.append(q)

    return Response(
        event_stream(q),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive"
        }
    )


if __name__ == "__main__":
    init_db()
    print("✅ Database initialized")
    print("🚀 Server running on http://localhost:5000")
    app.run(debug=True, threaded=True, port=5000)
