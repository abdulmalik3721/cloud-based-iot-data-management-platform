import pytest
from src.app import app


@pytest.fixture
def client():
    app.config["TESTING"] = True

    with app.test_client() as client:
        yield client


def test_home_endpoint(client):
    response = client.get("/")

    assert response.status_code == 200

    data = response.get_json()

    assert data["status"] == "success"


def test_health_endpoint(client):
    response = client.get("/api/health")

    assert response.status_code == 200

    data = response.get_json()

    assert data["status"] == "success"


def test_sensors_endpoint(client):
    response = client.get("/api/sensors")

    assert response.status_code == 200

    data = response.get_json()

    assert data["total_sensors"] == 2
    assert len(data["data"]) == 2


def test_sensor_device_ids(client):
    response = client.get("/api/sensors")

    data = response.get_json()

    device_ids = [
        sensor["device_id"]
        for sensor in data["data"]
    ]

    assert "ESP32_001" in device_ids
    assert "ESP32_002" in device_ids