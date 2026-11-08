
from flask import Blueprint, jsonify

from src.database import db
from src.models import Sensor, SensorReading
from src.sensor_simulator import generate_multiple_readings
from src.validation import validate_sensor_reading


api = Blueprint("api", __name__)


@api.route("/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "success",
        "message": "IoT platform API is running!"
    })


@api.route("/sensors", methods=["GET"])
def get_sensors():
    sensors = Sensor.query.all()

    return jsonify({
        "status": "success",
        "total_sensors": len(sensors),
        "data": [
            {
                "device_id": sensor.device_id,
                "name": sensor.name,
                "location": sensor.location,
                "status": sensor.status
            }
            for sensor in sensors
        ]
    })


@api.route("/readings/simulate", methods=["POST"])
def simulate_readings():
    readings = generate_multiple_readings()
    saved_readings = []

    for reading in readings:

        is_valid, message = validate_sensor_reading(reading)

        if not is_valid:
            return jsonify({
                "status": "error",
                "message": message
            }), 400

        sensor = Sensor.query.filter_by(
            device_id=reading["device_id"]
        ).first()

        if sensor is None:
            sensor = Sensor(
                device_id=reading["device_id"],
                status=reading.get("status", "online")
            )
            db.session.add(sensor)

        sensor.status = reading.get("status", "online")

        sensor_reading = SensorReading(
            sensor=sensor,
            temperature=reading["temperature"],
            humidity=reading["humidity"],
            air_quality=reading["air_quality"]
        )

        db.session.add(sensor_reading)

        saved_readings.append({
            "device_id": reading["device_id"],
            "temperature": reading["temperature"],
            "humidity": reading["humidity"],
            "air_quality": reading["air_quality"]
        })

    db.session.commit()

    return jsonify({
        "status": "success",
        "message": "Sensor readings saved to PostgreSQL!",
        "total_saved": len(saved_readings),
        "data": saved_readings
    }), 201


@api.route("/readings", methods=["GET"])
def get_readings():
    readings = (
        SensorReading.query
        .order_by(SensorReading.timestamp.desc())
        .limit(100)
        .all()
    )

    return jsonify({
        "status": "success",
        "total_readings": len(readings),
        "data": [
            {
                "device_id": reading.sensor.device_id,
                "temperature": reading.temperature,
                "humidity": reading.humidity,
                "air_quality": reading.air_quality,
                "timestamp": reading.timestamp.isoformat()
            }
            for reading in readings
        ]
    })
