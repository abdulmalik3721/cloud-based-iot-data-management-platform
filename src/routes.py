
import csv
import io

from flask import Blueprint, jsonify, make_response

from flask import request

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


def get_readings_query(device_id=None):
    query = SensorReading.query.join(Sensor)

    if device_id:
        query = query.filter(Sensor.device_id == device_id)

    return query


@api.route("/readings", methods=["GET"])
def get_readings():
    device_id = request.args.get("device_id", "").strip()

    query = get_readings_query(device_id or None)

    readings = (
        query.order_by(SensorReading.timestamp.desc())
        .limit(100)
        .all()
    )

    return jsonify({
        "status": "success",
        "total_readings": len(readings),
        "device_filter": device_id or "all",
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


@api.route("/readings/export", methods=["GET"])
def export_readings():
    device_id = request.args.get("device_id", "").strip()

    query = get_readings_query(device_id or None)

    readings = (
        query.order_by(SensorReading.timestamp.desc())
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "device_id",
        "temperature",
        "humidity",
        "air_quality",
        "timestamp"
    ])

    for reading in readings:
        writer.writerow([
            reading.sensor.device_id,
            reading.temperature,
            reading.humidity,
            reading.air_quality,
            reading.timestamp.isoformat()
        ])

    response = make_response(output.getvalue())

    response.headers["Content-Type"] = "text/csv; charset=utf-8"
    response.headers["Content-Disposition"] = (
        'attachment; filename="sensor_readings.csv"'
    )

    return response
