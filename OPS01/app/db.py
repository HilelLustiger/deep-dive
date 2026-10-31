import os

import psycopg


def init_db():
    with psycopg.connect(os.environ["DATABASE_URL"]) as conn, conn.cursor() as cur:
        cur.execute("""
                CREATE TABLE IF NOT EXISTS items (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL)
                """)


def create_item(name: str) -> dict:
    with psycopg.connect(os.environ["DATABASE_URL"]) as conn, conn.cursor() as cur:
        cur.execute(
            "INSERT INTO items (name) VALUES (%s) RETURNING id, name",
            (name,),
        )
        row = cur.fetchone()
    return {"id": row[0], "name": row[1]}


def get_item(item_id: int) -> dict | None:
    with psycopg.connect(os.environ["DATABASE_URL"]) as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT id, name FROM items WHERE id = %s",
            (item_id,),
        )
        row = cur.fetchone()
    if row is None:
        return None
    return {"id": row[0], "name": row[1]}


def count_items() -> int:
    with psycopg.connect(os.environ["DATABASE_URL"]) as conn, conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM items")
        row = cur.fetchone()
    return row[0]
