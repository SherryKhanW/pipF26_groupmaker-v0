"""GroupMaker v0 — backend.

Serves the roster, randomizes groups, and (in production) serves the
built frontend from frontend/dist.
"""

import csv
import json
import os
import random
from datetime import datetime, timezone

from flask import Flask, jsonify, request, send_from_directory

DIST_DIR = os.path.join(os.path.dirname(__file__), "frontend", "dist")
DATA_FILE = os.path.join(os.path.dirname(__file__), "data", "roster.json")
SURVEY_FILE = os.path.join(os.path.dirname(__file__), "data", "survey_responses.csv")

SURVEY_COLUMNS = ["name", "school_year", "major", "python_proficiency"]
SCHOOL_YEARS = {"First-year", "Sophomore", "Junior", "Senior", "Other"}
MAJORS = {
    "Finance",
    "Marketing",
    "Information Systems",
    "Economics",
    "Computer Science",
    "Undeclared",
    "Other",
}

app = Flask(__name__, static_folder=None)


def load_roster():
    with open(DATA_FILE, encoding="utf-8") as f:
        return json.load(f)


@app.get("/api/roster")
def get_roster():
    return jsonify(load_roster())


@app.post("/api/groups/randomize")
def randomize_groups():
    body = request.get_json(silent=True) or {}
    group_size = int(body.get("group_size", 4))
    group_size = max(2, min(group_size, 10))

    students = load_roster()["students"]
    random.shuffle(students)

    groups = [students[i : i + group_size] for i in range(0, len(students), group_size)]

    # Fold a too-small last group into the others, one member each.
    if len(groups) > 1 and len(groups[-1]) < max(2, group_size - 1):
        leftovers = groups.pop()
        for i, student in enumerate(leftovers):
            groups[i % len(groups)].append(student)

    return jsonify({"groups": [{"number": i + 1, "members": g} for i, g in enumerate(groups)]})


@app.post("/api/survey")
def submit_survey():
    body = request.get_json(silent=True) or {}
    roster_names = {s["name"] for s in load_roster()["students"]}

    missing = [col for col in SURVEY_COLUMNS if not str(body.get(col, "")).strip()]
    if missing:
        return jsonify({"error": "Missing required fields", "missing": missing}), 400

    name = str(body["name"]).strip()
    school_year = str(body["school_year"]).strip()
    major = str(body["major"]).strip()
    proficiency = str(body["python_proficiency"]).strip()

    if name not in roster_names:
        return jsonify({"error": "Name must be selected from the roster"}), 400
    if school_year not in SCHOOL_YEARS:
        return jsonify({"error": "Invalid school year"}), 400
    if major not in MAJORS:
        return jsonify({"error": "Invalid major"}), 400
    if proficiency not in {"1", "2", "3", "4", "5"}:
        return jsonify({"error": "Python proficiency must be 1–5"}), 400

    row = {
        "name": name,
        "school_year": school_year,
        "major": major,
        "python_proficiency": proficiency,
        "submitted_at": datetime.now(timezone.utc).isoformat(),
    }
    fieldnames = SURVEY_COLUMNS + ["submitted_at"]
    write_header = not os.path.isfile(SURVEY_FILE) or os.path.getsize(SURVEY_FILE) == 0

    with open(SURVEY_FILE, "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        if write_header:
            writer.writeheader()
        writer.writerow(row)

    return jsonify({"ok": True})


# ---- Serve the built frontend (production) ----------------------------------
# In development you won't use these routes: Vite serves the frontend at
# localhost:5173 and proxies /api requests here.


@app.get("/")
def index():
    return send_from_directory(DIST_DIR, "index.html")


@app.get("/<path:path>")
def assets(path):
    full = os.path.join(DIST_DIR, path)
    if os.path.isfile(full):
        return send_from_directory(DIST_DIR, path)
    return send_from_directory(DIST_DIR, "index.html")


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8000, debug=True)

