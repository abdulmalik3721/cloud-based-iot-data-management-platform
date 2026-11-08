
// ==========================================
// IoT Monitoring Dashboard
// Fetch and display sensor data from Flask
// ==========================================

const REFRESH_INTERVAL = 5000;

let temperatureChart = null;


// Fetch JSON data from the Flask API
async function fetchAPI(endpoint) {
    const response = await fetch(endpoint, {
        cache: "no-store"
    });

    if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
    }

    return await response.json();
}


// Format timestamps for display
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
        return "Unknown";
    }

    return date.toLocaleString();
}


// Safely create a table cell
function createCell(value) {
    const cell = document.createElement("td");
    cell.textContent = value ?? "—";
    return cell;
}


// Display registered sensors
function updateSensorTable(sensors) {
    const tableBody = document.getElementById("sensorTableBody");

    tableBody.replaceChildren();

    if (sensors.length === 0) {
        const row = document.createElement("tr");
        const cell = createCell("No sensors registered yet.");
        cell.colSpan = 4;
        row.appendChild(cell);
        tableBody.appendChild(row);
        return;
    }

    sensors.forEach(sensor => {
        const row = document.createElement("tr");

        row.appendChild(createCell(sensor.device_id));
        row.appendChild(createCell(sensor.name || "—"));
        row.appendChild(createCell(sensor.location || "—"));

        const statusCell = createCell(sensor.status || "unknown");

        statusCell.className =
            sensor.status === "online" ? "online" : "offline";

        row.appendChild(statusCell);

        tableBody.appendChild(row);
    });
}


// Display recent sensor readings
function updateReadingsTable(readings) {
    const tableBody = document.getElementById("readingsTableBody");

    tableBody.replaceChildren();

    if (readings.length === 0) {
        const row = document.createElement("tr");
        const cell = createCell("No readings available yet.");
        cell.colSpan = 5;
        row.appendChild(cell);
        tableBody.appendChild(row);
        return;
    }

    readings.slice(0, 10).forEach(reading => {
        const row = document.createElement("tr");

        row.appendChild(createCell(reading.device_id));
        row.appendChild(createCell(`${reading.temperature} °C`));
        row.appendChild(createCell(`${reading.humidity} %`));
        row.appendChild(createCell(reading.air_quality));
        row.appendChild(createCell(formatTimestamp(reading.timestamp)));

        tableBody.appendChild(row);
    });
}


// Update dashboard metric cards
function updateMetrics(sensors, readings) {
    document.getElementById("totalSensors").textContent =
        sensors.length;

    document.getElementById("onlineSensors").textContent =
        sensors.filter(sensor => sensor.status === "online").length;

    if (readings.length === 0) {
        document.getElementById("latestTemp").textContent = "-- °C";
        document.getElementById("latestHumidity").textContent = "-- %";
        document.getElementById("latestAirQuality").textContent = "--";
        return;
    }

    const latest = readings[0];

    document.getElementById("latestTemp").textContent =
        `${latest.temperature} °C`;

    document.getElementById("latestHumidity").textContent =
        `${latest.humidity} %`;

    document.getElementById("latestAirQuality").textContent =
        latest.air_quality;
}


// Create or update temperature chart
function updateTemperatureChart(readings) {
    if (typeof Chart === "undefined") {
        console.error("Chart.js could not be loaded.");
        return;
    }

    const orderedReadings = [...readings].reverse();

    const labels = orderedReadings.map(reading =>
        new Date(reading.timestamp).toLocaleTimeString()
    );

    const temperatures = orderedReadings.map(reading =>
        reading.temperature
    );

    const chartCanvas = document.getElementById("temperatureChart");

    if (!temperatureChart) {
        temperatureChart = new Chart(chartCanvas, {
            type: "line",

            data: {
                labels: labels,

                datasets: [{
                    label: "Temperature (°C)",
                    data: temperatures,
                    borderColor: "#2563eb",
                    backgroundColor: "rgba(37, 99, 235, 0.12)",
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3
                }]
            },

            options: {
                responsive: true,

                scales: {
                    y: {
                        beginAtZero: false,
                        title: {
                            display: true,
                            text: "Temperature (°C)"
                        }
                    },

                    x: {
                        title: {
                            display: true,
                            text: "Reading time"
                        }
                    }
                }
            }
        });

    } else {
        temperatureChart.data.labels = labels;
        temperatureChart.data.datasets[0].data = temperatures;
        temperatureChart.update();
    }
}


// Update connection indicator
function updateConnectionStatus(connected) {
    const indicator = document.querySelector(".status-indicator");

    if (indicator) {
        indicator.style.backgroundColor =
            connected ? "#22c55e" : "#dc2626";
    }
}


// Refresh dashboard from Flask API
async function refreshDashboard() {
    try {
        const [sensorResponse, readingResponse] = await Promise.all([
            fetchAPI("/api/sensors"),
            fetchAPI("/api/readings")
        ]);

        const sensors = sensorResponse.data || [];
        const readings = readingResponse.data || [];

        updateMetrics(sensors, readings);
        updateSensorTable(sensors);
        updateReadingsTable(readings);
        updateTemperatureChart(readings);

        updateConnectionStatus(true);

        console.log("Dashboard updated successfully.");

    } catch (error) {
        console.error("Dashboard update failed:", error);

        updateConnectionStatus(false);
    }
}


// Load dashboard immediately
refreshDashboard();

// Refresh existing database readings every five seconds
setInterval(refreshDashboard, REFRESH_INTERVAL);
