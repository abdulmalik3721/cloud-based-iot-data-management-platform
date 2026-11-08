import os
from urllib.parse import quote_plus

from dotenv import load_dotenv
from flask import Flask, jsonify

from src.database import db
from src.routes import api


# Load environment variables
load_dotenv()


# Initialize Flask
app = Flask(__name__)


# Read database configuration
db_user = os.getenv("DB_USER")
db_password = quote_plus(os.getenv("DB_PASSWORD", ""))
db_host = os.getenv("DB_HOST")
db_port = os.getenv("DB_PORT")
db_name = os.getenv("DB_NAME")


# Configure PostgreSQL connection
app.config["SQLALCHEMY_DATABASE_URI"] = (
    f"postgresql+psycopg2://{db_user}:{db_password}"
    f"@{db_host}:{db_port}/{db_name}"
)

app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False


# Initialize database with Flask
db.init_app(app)


# Register API routes
app.register_blueprint(api, url_prefix="/api")


@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "project": "Cloud-Based IoT Data Management Platform",
        "message": "Flask application is running successfully!",
        "status": "success"
    })


if __name__ == "__main__":
    app.run(debug=True)