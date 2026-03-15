# train_mood_model.py
# Run this ONCE on your Mac to generate MoodScoreModel.mlmodel
# Then drag MoodScoreModel.mlmodel into your Xcode project.
#
# Requirements (run these first in Terminal):
#   pip3 install scikit-learn coremltools numpy pandas
#
# Usage:
#   python3 train_mood_model.py
#
# Output:
#   MoodScoreModel.mlmodel  <-- drag this into Xcode

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error
import coremltools as ct

# ─────────────────────────────────────────────
# 1. Feature names  (must match Swift featureArray order exactly)
# ─────────────────────────────────────────────
FEATURES = [
    'unlock_count_norm',      # daily unlocks / 80
    'screen_time_norm',       # screen minutes / 480
    'social_app_ratio',       # social time / total screen time
    'typing_wpm_norm',        # WPM / 60
    'typing_error_rate',      # errors / total keystrokes
    'steps_norm',             # steps / 10000
    'stationary_hours_norm',  # stationary hours / 16
    'call_count_norm',        # outgoing calls / 10
    'call_duration_norm',     # avg call seconds / 300
    'contact_diversity_norm', # unique contacts / 10
    'sleep_duration_norm',    # sleep hours / 9
    'sleep_regularity',       # 1.0 - (std_dev_hours / 4)
    'left_home',              # 1.0 if left home
    'ambient_db_norm',        # avg daytime dB / 70
    'charge_regularity',      # 1.0 = consistent charge time
]

# ─────────────────────────────────────────────
# 2. Synthetic dataset generation
#    Formula mirrors what a clinician would expect:
#    high movement + good sleep + social contact = high mood score
# ─────────────────────────────────────────────
def generate_synthetic_data(n: int = 3000, seed: int = 42) -> tuple:
    rng = np.random.default_rng(seed)
    X = rng.uniform(0, 1, (n, len(FEATURES)))

    idx = {name: i for i, name in enumerate(FEATURES)}

    # Weighted sum → mood score 0–100
    y = (
        15.0 * X[:, idx['steps_norm']] +
        15.0 * X[:, idx['sleep_duration_norm']] +
        12.0 * X[:, idx['sleep_regularity']] +
        12.0 * X[:, idx['contact_diversity_norm']] +
        10.0 * X[:, idx['call_count_norm']] +
        10.0 * X[:, idx['left_home']] +
         8.0 * X[:, idx['typing_wpm_norm']] +
         8.0 * (1 - X[:, idx['stationary_hours_norm']]) +  # less stationary = better
         5.0 * X[:, idx['ambient_db_norm']] +
         5.0 * X[:, idx['charge_regularity']]
        # Sum of weights = 100  →  y already in [0, 100]
    )

    # Add mild noise to avoid overfitting to the exact formula
    noise = rng.normal(0, 3, n)
    y = np.clip(y + noise, 0, 100)

    return X, y

# ─────────────────────────────────────────────
# 3. Train Random Forest
# ─────────────────────────────────────────────
print("Generating synthetic training data...")
X, y = generate_synthetic_data(n=3000)

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

print(f"Training on {len(X_train)} samples...")
model = RandomForestRegressor(
    n_estimators=100,
    max_depth=10,
    min_samples_leaf=5,
    random_state=42,
    n_jobs=-1
)
model.fit(X_train, y_train)

# Evaluation
y_pred = model.predict(X_test)
mae = mean_absolute_error(y_test, y_pred)
print(f"Test MAE: {mae:.2f} points (out of 100)")
print(f"Feature importances:")
for name, importance in sorted(zip(FEATURES, model.feature_importances_), key=lambda x: -x[1]):
    print(f"  {name:<30} {importance:.3f}")

# ─────────────────────────────────────────────
# 4. Convert to CoreML .mlmodel
# ─────────────────────────────────────────────
print("\nConverting to CoreML...")

# Build a sample input for coremltools
sample_input = pd.DataFrame([X_train[0]], columns=FEATURES)

cml_model = ct.converters.sklearn.convert(
    model,
    input_features=FEATURES,
    output_feature_names='mood_score'
)

# Add metadata
cml_model.author = "Serenity"
cml_model.license = "Private"
cml_model.short_description = "Predicts daily mood score (0–100) from passive behavioural signals."
cml_model.version = "1.0"

for feature in FEATURES:
    cml_model.input_description[feature] = f"Normalised {feature.replace('_', ' ')} (0.0–1.0)"
cml_model.output_description['mood_score'] = "Mood score 0–100. Higher = better wellbeing."

output_path = "MoodScoreModel.mlmodel"
cml_model.save(output_path)

print(f"\n✅ Saved: {output_path}")
print("Next step: Drag MoodScoreModel.mlmodel into your Xcode project (into the Serenity/ML/ folder).")
print("Make sure 'Add to target: Serenity' is checked when Xcode asks.")
