"""
Service de prédiction d'admission — XGBoost
=============================================
Entraîne un modèle XGBoost sur les scores historiques et prédit
la probabilité d'admission d'un bachelier à une filière donnée.

Usage (entraînement) :
    Exécuter le notebook principal :
    backend/notebooks/models_form.ipynb

Usage (prédiction) :
    from orientation.services.prediction import predict_admission
    result = predict_admission(score=130, section_bac="S", filiere_code="601")
"""
import logging
import os

import joblib
import numpy as np
import pandas as pd
from django.conf import settings

logger = logging.getLogger(__name__)

# ── Section bac encoding ─────────────────────────────────────────────
SECTION_ENCODING = {
    "M": 0, "S": 1, "T": 2, "E": 3, "L": 4, "I": 5, "SP": 6,
}

MODEL_PATH = getattr(
    settings, "ML_MODEL_PATH",
    os.path.join(os.path.dirname(__file__), "..", "ml", "model_main.joblib"),
)

_model_cache = None


def _get_model():
    """Load model from disk (cached in memory)."""
    global _model_cache
    if _model_cache is None:
        if not os.path.isfile(MODEL_PATH):
            logger.warning("Modèle introuvable à %s — entraînez-le d'abord.", MODEL_PATH)
            return None
        _model_cache = joblib.load(MODEL_PATH)
        logger.info("Modèle XGBoost chargé depuis %s", MODEL_PATH)
    return _model_cache


def build_training_data() -> pd.DataFrame:
    """
    Extrait les données d'entraînement depuis la base PostgreSQL.
    Retourne un DataFrame avec les colonnes :
        score_dernier_admis, section_encoded, filiere_id, admitted (1/0)
    """
    from orientation.models import ScoreHistorique

    qs = ScoreHistorique.objects.select_related("filiere").all()
    rows = []
    for s in qs:
        section_code = s.section_bac
        rows.append({
            "filiere_id": s.filiere_id,
            "annee": s.annee,
            "section_encoded": SECTION_ENCODING.get(section_code, 0),
            "score_dernier_admis": s.score_dernier_admis,
        })

    if not rows:
        return pd.DataFrame()

    df = pd.DataFrame(rows)

    # Créer des exemples positifs et négatifs pour la classification
    training_rows = []
    for _, row in df.iterrows():
        seuil = row["score_dernier_admis"]
        # Exemple admis (score >= seuil)
        training_rows.append({
            "score": seuil + np.random.uniform(0.5, 8.0),
            "section_encoded": row["section_encoded"],
            "filiere_id": row["filiere_id"],
            "annee": row["annee"],
            "admitted": 1,
        })
        # Exemple admis (score juste au-dessus)
        training_rows.append({
            "score": seuil + np.random.uniform(0.1, 2.0),
            "section_encoded": row["section_encoded"],
            "filiere_id": row["filiere_id"],
            "annee": row["annee"],
            "admitted": 1,
        })
        # Exemple non admis (score < seuil)
        training_rows.append({
            "score": max(0, seuil - np.random.uniform(0.1, 3.0)),
            "section_encoded": row["section_encoded"],
            "filiere_id": row["filiere_id"],
            "annee": row["annee"],
            "admitted": 0,
        })
        # Exemple non admis (score bien en dessous)
        training_rows.append({
            "score": max(0, seuil - np.random.uniform(3.0, 12.0)),
            "section_encoded": row["section_encoded"],
            "filiere_id": row["filiere_id"],
            "annee": row["annee"],
            "admitted": 0,
        })

    return pd.DataFrame(training_rows)


def train_model() -> dict:
    """
    Entraîne le modèle XGBoost et le sauvegarde sur disque.
    Retourne les métriques d'entraînement.
    """
    from xgboost import XGBClassifier
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import accuracy_score, roc_auc_score

    df = build_training_data()
    if df.empty:
        return {"error": "Aucune donnée d'entraînement. Importez d'abord les scores CSV."}

    features = ["score", "section_encoded", "filiere_id"]
    X = df[features]
    y = df["admitted"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y,
    )

    model = XGBClassifier(
        n_estimators=200,
        max_depth=5,
        learning_rate=0.1,
        objective="binary:logistic",
        eval_metric="logloss",
        random_state=42,
        use_label_encoder=False,
    )
    model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)

    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]

    metrics = {
        "accuracy": round(accuracy_score(y_test, y_pred), 4),
        "auc_roc": round(roc_auc_score(y_test, y_proba), 4),
        "train_size": len(X_train),
        "test_size": len(X_test),
    }

    # Save
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    logger.info("Modèle sauvegardé → %s | Metrics: %s", MODEL_PATH, metrics)

    # Reset cache
    global _model_cache
    _model_cache = None

    return metrics


def predict_admission(score: float, section_bac: str, filiere_code: str) -> dict:
    """
    Prédit la probabilité d'admission.

    Args:
        score: Score du bachelier (barème réel, ex: 130)
        section_bac: Code section (M, S, T, E, L, I, SP)
        filiere_code: Code de la filière

    Returns:
        dict avec probabilité, conseil, etc.
    """
    from orientation.models import Filiere, ScoreHistorique

    # Rechercher la filière
    try:
        filiere = Filiere.objects.get(code=filiere_code)
    except Filiere.DoesNotExist:
        return {"error": f"Filière '{filiere_code}' introuvable."}

    # Dernier score connu (indépendamment de la section bac)
    dernier_score = (
        ScoreHistorique.objects
        .filter(filiere=filiere)
        .order_by("-annee")
        .first()
    )

    model = _get_model()

    if model is not None:
        section_enc = SECTION_ENCODING.get(section_bac.upper(), 0)
        X_input = np.array([[score, section_enc, filiere.id]])
        proba = float(model.predict_proba(X_input)[0][1])
    else:
        # Fallback heuristique si pas de modèle entraîné
        if dernier_score:
            diff = score - dernier_score.score_dernier_admis
            proba = min(1.0, max(0.0, 0.5 + diff / 20.0))
        else:
            proba = 0.5

    # Conseil textuel
    if proba >= 0.8:
        conseil = "Excellentes chances d'admission ! Vous pouvez postuler en confiance."
    elif proba >= 0.5:
        conseil = "Chances correctes. Pensez à ajouter des choix de sécurité."
    elif proba >= 0.3:
        conseil = "Admission incertaine. Diversifiez vos choix de filières."
    else:
        conseil = "Admission peu probable. Envisagez des alternatives ou améliorez votre score."

    return {
        "filiere_code": filiere.code,
        "filiere_nom": filiere.nom,
        "probabilite_admission": round(proba, 4),
        "score_dernier_admis_precedent": (
            dernier_score.score_dernier_admis if dernier_score else None
        ),
        "conseil": conseil,
    }
