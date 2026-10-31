from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from app import db


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_db()
    yield


app = FastAPI(lifespan=lifespan)


class NewItem(BaseModel):
    name: str


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.get("/items/{item_id}")
def get_item(item_id: int):
    item = db.get_item(item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")

    return item


@app.post("/items", status_code=201)
def create_item(new_item: NewItem):
    return db.create_item(new_item.name)
