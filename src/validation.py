def validate_sensor_reading(reading):

    required_fields = [
        "device_id",
        "temperature",
        "humidity",
        "air_quality"
    ]

    # Check whether all required fields exist
    for field in required_fields:
        if field not in reading:
            return False, f"Missing field: {field}"

    # Validate device ID
    if not isinstance(reading["device_id"], str) or not reading["device_id"].strip():
        return False, "Invalid device ID"

    # Validate temperature
    if not isinstance(reading["temperature"], (int, float)) or isinstance(reading["temperature"], bool):
        return False, "Temperature must be a number"

    if not -50 <= reading["temperature"] <= 100:
        return False, "Temperature must be between -50 and 100"

    # Validate humidity
    if not isinstance(reading["humidity"], (int, float)) or isinstance(reading["humidity"], bool):
        return False, "Humidity must be a number"

    if not 0 <= reading["humidity"] <= 100:
        return False, "Humidity must be between 0 and 100"

    # Validate air quality
    if not isinstance(reading["air_quality"], (int, float)) or isinstance(reading["air_quality"], bool):
        return False, "Air quality must be a number"

    if not 0 <= reading["air_quality"] <= 500:
        return False, "Air quality must be between 0 and 500"

    return True, "Sensor reading is valid"