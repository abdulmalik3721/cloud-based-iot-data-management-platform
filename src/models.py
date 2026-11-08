
from datetime import datetime, timezone

from src.database import db


class Sensor(db.Model):
    __tablename__ = "sensors"

    id = db.Column(db.Integer, primary_key=True)

    device_id = db.Column(
        db.String(50),
        unique=True,
        nullable=False
    )

    name = db.Column(db.String(100))

    location = db.Column(db.String(150))

    status = db.Column(
        db.String(20),
        default="online"
    )

    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    readings = db.relationship(
        "SensorReading",
        back_populates="sensor",
        cascade="all, delete-orphan"
    )


class SensorReading(db.Model):
    __tablename__ = "sensor_readings"

    id = db.Column(db.Integer, primary_key=True)

    sensor_id = db.Column(
        db.Integer,
        db.ForeignKey("sensors.id"),
        nullable=False
    )

    temperature = db.Column(db.Float, nullable=False)

    humidity = db.Column(db.Float, nullable=False)

    air_quality = db.Column(db.Float, nullable=False)

    timestamp = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    sensor = db.relationship(
        "Sensor",
        back_populates="readings"
    )
