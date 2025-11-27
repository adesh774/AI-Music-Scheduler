from flask import Flask, request, jsonify, render_template
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

app = Flask(__name__)

train_texts = [
    "I feel relaxed and peaceful",
    "chill lo fi vibes",
    "need calm music for sleeping",
    "want to study with focus low beat",
    "I am very happy and excited",
    "high energy workout song",
    "party dance edm",
    "romantic love song",
    "missing someone emotional",
    "sad breakup song"
]

train_labels = [
    "calm", "calm", "calm",
    "focus",
    "energetic", "energetic", "energetic",
    "romantic",
    "sad", "sad"
]

vectorizer = TfidfVectorizer()
X_train = vectorizer.fit_transform(train_texts)
clf = LogisticRegression()
clf.fit(X_train, train_labels)

SONG_DB = {
    "calm": [
        {"title": "Lo-fi Chill Mix", "url": "https://youtu.be/jfKfPfyJRdk"},
        {"title": "Rainy Lofi Vibes", "url": "https://youtu.be/7NOSDKb0HlU"},
    ],
    "focus": [
        {"title": "Deep Focus Music", "url": "https://youtu.be/2OEL4P1Rz04"},
        {"title": "Study With Me Lofi", "url": "https://youtu.be/rUxyKA_-grg"},
    ],
    "energetic": [
        {"title": "Upbeat EDM Mix", "url": "https://youtu.be/6JYIGclVQdw"},
        {"title": "Workout Motivation", "url": "https://youtu.be/Xqcaf8bYDrQ"},
    ],
    "romantic": [
        {"title": "Romantic Hindi Mix", "url": "https://youtu.be/6X7K7XG1U6g"},
        {"title": "Soft Love Songs", "url": "https://youtu.be/DY_rFed96Mg"},
    ],
    "sad": [
        {"title": "Sad Hindi Mix", "url": "https://youtu.be/hbG9fWsdS_c"},
        {"title": "Heartbreak Songs", "url": "https://youtu.be/5Y7Q8HFezN8"},
    ]
}

def rule_based_mood(text: str):
    t = text.lower()
    if any(k in t for k in ["sad", "cry", "alone", "missing", "breakup"]):
        return "sad"
    if any(k in t for k in ["study", "exam", "focus", "concentrate", "coding"]):
        return "focus"
    if any(k in t for k in ["happy", "excited", "party", "dance", "workout"]):
        return "energetic"
    if any(k in t for k in ["love", "romantic", "crush", "girlfriend", "boyfriend"]):
        return "romantic"
    if any(k in t for k in ["sleep", "tired", "relaxed", "lofi", "peaceful", "calm"]):
        return "calm"
    return None

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/api/predict_mood", methods=['POST'])
def predict_mood():
    data = request.get_json()
    text = data.get("text", "")

    if not text.strip():
        return jsonify({"error": "No text"}), 400

    mood = rule_based_mood(text)

    if mood is None:
        X = vectorizer.transform([text])
        mood = clf.predict(X)[0]

    songs = SONG_DB.get(mood, [])
    return jsonify({"mood": mood, "songs": songs})

if __name__ == "__main__":
    app.run(debug=True)
