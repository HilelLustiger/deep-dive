from fastapi import FastAPI, HTTPException

items = {
    1: "name1",
    2: "name2",
    3: "name3"
}

app = FastAPI()

@app.get("/health")
async def health_check():
    return {"status": "ok"}

@app.get("/items/{item_id}")
async def get_item(item_id: int):
    if item_id not in items:
        raise HTTPException(status_code=404, detail="Item not found")

    return {"id": item_id, "name": items[item_id]}