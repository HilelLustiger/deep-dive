"""Tests for Parts 1 and 2: /items."""
import pytest
from fastapi.testclient import TestClient

from app.main import app

pytestmark = pytest.mark.integration


@pytest.fixture
def client():
    # The with block runs the lifespan, so init_db() has created the table.
    with TestClient(app) as client:
        yield client


def test_create_item(client):
    response = client.post("/items", json={"name": "pen"})

    assert response.status_code == 201
    body = response.json()
    assert isinstance(body["id"], int)
    assert body["name"] == "pen"


def test_get_created_item(client):
    created = client.post("/items", json={"name": "cup"}).json()

    response = client.get(f"/items/{created['id']}")

    assert response.status_code == 200
    assert response.json() == created


def test_get_missing_item_returns_404(client):
    response = client.get("/items/999999")

    assert response.status_code == 404


def test_two_posts_return_different_ids(client):
    first = client.post("/items", json={"name": "a"}).json()
    second = client.post("/items", json={"name": "b"}).json()

    assert first["id"] != second["id"]


def test_non_integer_id_returns_422(client):
    response = client.get("/items/abc")

    assert response.status_code == 422
