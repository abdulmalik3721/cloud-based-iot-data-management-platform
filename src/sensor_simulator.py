import random
from datetime import datetime, timezone


def generate_sensor_reading(device_id):
    reading = {
        "device_id": device_id,
        "temperature": round(random.uniform(18, 40), 1),
        "humidity": random.randint(30, 90),
        "air_quality": random.randint(0, 150),
        "status": "online",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    return reading


def generate_multiple_readings():
    device_ids = [
        "ESP32_001",
        "ESP32_002",
        "ESP32_003"
    ]

    readings = []

    for device_id in device_ids:
        reading = generate_sensor_reading(device_id)
        readings.append(reading)

    return readings


if __name__ == "__main__":
    sensor_data = generate_multiple_readings()

    for reading in sensor_data:
        print(reading)