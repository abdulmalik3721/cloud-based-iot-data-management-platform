
// ==========================================
// IoT Monitoring Dashboard
// Multi-Sensor Analytics
// ==========================================

const REFRESH_INTERVAL = 5000;

const DEVICE_COLORS = [
    "#2563eb",
    "#16a34a",
    "#f97316",
    "#9333ea",
    "#0891b2"
];

let temperatureChart = null;
let humidityChart = null;
let airQualityChart = null;


// Fetch data from Flask API
async function fetchAPI(endpoint) {
    const response = await fetch(endpoint, {
        cache: "no-store"
    });

    if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
    }

    return await response.json();
}


// Format timestamp
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
        return "Unknown";
    }

    return date.toLocaleString();
}


// Create a safe table cell
function createCell(value) {
    const cell = document.createElement("td");
    cell.textContent = value ?? "—";
    return cell;
}


// Update sensor table
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


// Update recent readings table
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


// Create or update an individual sensor metric chart
function updateMetricChart(
    existingChart,
    canvasId,
    readings,
    metric,
    metricLabel,
    unit
) {
    if (typeof Chart === "undefined") {
        console.error("Chart.js could not be loaded.");
        return existingChart;
    }

    const orderedReadings = [...readings].sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );

    const labels = orderedReadings.map(reading =>
        new Date(reading.timestamp).toLocaleTimeString()
    );

    // Identify all connected sensor devices
    const deviceIds = [
        ...new Set(orderedReadings.map(reading => reading.device_id))
    ];

    // Create one dataset for each sensor
    const datasets = deviceIds.map((deviceId, index) => ({
        label: deviceId,

        data: orderedReadings.map(reading =>
            reading.device_id === deviceId
                ? Number(reading[metric])
                : null
        ),

        borderColor: DEVICE_COLORS[index % DEVICE_COLORS.length],

        backgroundColor: DEVICE_COLORS[index % DEVICE_COLORS.length],

        borderWidth: 2,

        pointRadius: 3,

        tension: 0.3,

        spanGaps: true
    }));

    const chartCanvas = document.getElementById(canvasId);

    if (!chartCanvas) {
        console.error(`Canvas not found: ${canvasId}`);
        return existingChart;
    }

    if (!existingChart) {
        existingChart = new Chart(chartCanvas, {
            type: "line",

            data: {
                labels: labels,
                datasets: datasets
            },

            options: {
                responsive: true,

                interaction: {
                    mode: "index",
                    intersect: false
                },

                plugins: {
                    legend: {
                        display: true,
                        position: "top"
                    }
                },

                scales: {
                    y: {
                        beginAtZero: metric !== "temperature",

                        title: {
                            display: true,
                            text: `${metricLabel} (${unit})`
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
        existingChart.data.labels = labels;
        existingChart.data.datasets = datasets;
        existingChart.update();
    }

    return existingChart;
}


// Update connection indicator
function updateConnectionStatus(connected) {
    const indicator = document.querySelector(".status-indicator");

    if (indicator) {
        indicator.style.backgroundColor =
            connected ? "#22c55e" : "#dc2626";
    }
}


// Refresh complete dashboard
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

        // Temperature chart
        temperatureChart = updateMetricChart(
            temperatureChart,
            "temperatureChart",
            readings,
            "temperature",
            "Temperature",
            "°C"
        );

        // Humidity chart
        humidityChart = updateMetricChart(
            humidityChart,
            "humidityChart",
            readings,
            "humidity",
            "Humidity",
            "%"
        );

        // Air quality chart
        airQualityChart = updateMetricChart(
            airQualityChart,
            "airQualityChart",
            readings,
            "air_quality",
            "Air Quality",
            "index"
        );

        updateConnectionStatus(true);

        console.log("Dashboard updated successfully.");

    } catch (error) {
        console.error("Dashboard update failed:", error);
        updateConnectionStatus(false);
    }
}


// Generate new sensor readings
async function generateSensorReadings() {
    const button = document.getElementById("generateReadingsBtn");
    const message = document.getElementById("actionMessage");

    if (!button || !message) {
        console.error("Generate button or message element not found.");
        return;
    }

    button.disabled = true;
    button.textContent = "Generating...";
    message.textContent = "";
    message.style.color = "";

    try {
        const response = await fetch("/api/readings/simulate", {
            method: "POST"
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.message || "Unable to generate readings"
            );
        }

        message.textContent =
            `${result.message} Total saved: ${result.total_saved}`;

        await refreshDashboard();

    } catch (error) {
        message.textContent = error.message;
        message.style.color = "#dc2626";

    } finally {
        button.disabled = false;
        button.textContent = "Generate Sensor Readings";
    }
}


// Connect generate button
// Generate sensor readings
document
    .getElementById("generateReadingsBtn")
    .addEventListener("click", generateSensorReadings);


// Filter readings when the selected device changes
document
    .getElementById("deviceFilter")
    .addEventListener("change", refreshDashboard);


// Download CSV
document
    .getElementById("exportCsvBtn")
    .addEventListener("click", downloadCSV);

// Initial dashboard loading

function populateDeviceFilter(sensors) {
    const select = document.getElementById("deviceFilter");

    if (!select) return;

    const selectedValue = select.value;

    const deviceIds = sensors.map(sensor => sensor.device_id);

    const currentIds = Array.from(select.options)
        .slice(1)
        .map(option => option.value);

    // Rebuild options only when the device list changes
    if (deviceIds.join(",") !== currentIds.join(",")) {
        select.replaceChildren();

        const allOption = document.createElement("option");
        allOption.value = "";
        allOption.textContent = "All Devices";
        select.appendChild(allOption);

        deviceIds.forEach(deviceId => {
            const option = document.createElement("option");
            option.value = deviceId;
            option.textContent = deviceId;
            select.appendChild(option);
        });

        if (deviceIds.includes(selectedValue)) {
            select.value = selectedValue;
        }
    }
}


// Download CSV for selected device
function downloadCSV() {
    const select = document.getElementById("deviceFilter");
    const selectedDevice = select ? select.value : "";

    const params = new URLSearchParams();

    if (selectedDevice) {
        params.set("device_id", selectedDevice);
    }

    const query = params.toString();

    window.location.href = query
        ? `/api/readings/export?${query}`
        : "/api/readings/export";
}


async function refreshDashboard() {
    try {
        const sensorResponse = await fetchAPI("/api/sensors");

        const sensors = sensorResponse.data || [];

        populateDeviceFilter(sensors);

        const selectedDevice = document.getElementById("deviceFilter").value;

        const readingsEndpoint = selectedDevice
            ? `/api/readings?device_id=${encodeURIComponent(selectedDevice)}`
            : "/api/readings";

        const readingResponse = await fetchAPI(readingsEndpoint);

        const readings = readingResponse.data || [];

        updateMetrics(sensors, readings);
        updateSensorTable(sensors);
        updateReadingsTable(readings);

        temperatureChart = updateMetricChart(
            temperatureChart,
            "temperatureChart",
            readings,
            "temperature",
            "Temperature",
            "°C"
        );

        humidityChart = updateMetricChart(
            humidityChart,
            "humidityChart",
            readings,
            "humidity",
            "Humidity",
            "%"
        );

        airQualityChart = updateMetricChart(
            airQualityChart,
            "airQualityChart",
            readings,
            "air_quality",
            "Air Quality",
            "index"
        );

        updateConnectionStatus(true);

        console.log("Dashboard updated successfully.");

    } catch (error) {
        console.error("Dashboard update failed:", error);
        updateConnectionStatus(false);
    }
}



// Refresh dashboard every five seconds
setInterval(refreshDashboard, REFRESH_INTERVAL);
