"""Tests for Parts 1 and 2: /items."""
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_get_existing_item():
    response = client.get("/items/1")

    assert response.status_code == 200
    assert response.json() == {"id": 1, "name": "name1"}


def test_get_missing_item_returns_404():
    response = client.get("/items/999")

    assert response.status_code == 404


def test_non_integer_id_returns_422():
    response = client.get("/items/abc")

    assert response.status_code == 422
