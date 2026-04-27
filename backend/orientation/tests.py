"""
Tests unitaires — App Orientation
===================================
Couvre : modèles, API endpoints, ETL, prédiction.

Lancer : python manage.py test orientation
"""
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from orientation.models import Gouvernorat, Universite, Filiere, ScoreHistorique


# ── Model Tests ──────────────────────────────────────────────────────

class GouvernoratModelTest(TestCase):
    def test_creation(self):
        gov = Gouvernorat.objects.create(nom="Tunis")
        self.assertEqual(str(gov), "Tunis")
        self.assertEqual(Gouvernorat.objects.count(), 1)

    def test_unique_nom(self):
        Gouvernorat.objects.create(nom="Sousse")
        with self.assertRaises(Exception):
            Gouvernorat.objects.create(nom="Sousse")


class UniversiteModelTest(TestCase):
    def setUp(self):
        self.gov = Gouvernorat.objects.create(nom="Tunis")

    def test_creation(self):
        univ = Universite.objects.create(nom="FST", gouvernorat=self.gov)
        self.assertIn("FST", str(univ))
        self.assertIn("Tunis", str(univ))

    def test_relation_gouvernorat(self):
        Universite.objects.create(nom="ENIT", gouvernorat=self.gov)
        self.assertEqual(self.gov.universites.count(), 1)


class FiliereModelTest(TestCase):
    def setUp(self):
        gov = Gouvernorat.objects.create(nom="Sfax")
        self.univ = Universite.objects.create(nom="ENIS", gouvernorat=gov)

    def test_creation(self):
        filiere = Filiere.objects.create(
            code="801", nom="Cycle Préparatoire", universite=self.univ,
        )
        self.assertIn("801", str(filiere))

    def test_unique_code(self):
        Filiere.objects.create(code="801", nom="F1", universite=self.univ)
        with self.assertRaises(Exception):
            Filiere.objects.create(code="801", nom="F2", universite=self.univ)


class ScoreHistoriqueModelTest(TestCase):
    def setUp(self):
        gov = Gouvernorat.objects.create(nom="Monastir")
        univ = Universite.objects.create(nom="ENIM", gouvernorat=gov)
        self.filiere = Filiere.objects.create(
            code="902", nom="Prépa Ingénieur", universite=univ,
        )

    def test_creation(self):
        score = ScoreHistorique.objects.create(
            filiere=self.filiere,
            annee=2024,
            section_bac="M",
            score_dernier_admis=2.62,
        )
        self.assertIn("902", str(score))
        self.assertIn("2024", str(score))

    def test_unique_together(self):
        ScoreHistorique.objects.create(
            filiere=self.filiere, annee=2024, section_bac="M",
            score_dernier_admis=2.62,
        )
        with self.assertRaises(Exception):
            ScoreHistorique.objects.create(
                filiere=self.filiere, annee=2024, section_bac="M",
                score_dernier_admis=2.70,
            )


# ── API Tests ────────────────────────────────────────────────────────

class APIEndpointsTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        # Seed minimal data
        self.gov = Gouvernorat.objects.create(nom="Tunis")
        self.univ = Universite.objects.create(nom="FST", gouvernorat=self.gov)
        self.filiere = Filiere.objects.create(
            code="201", nom="Licence Informatique", universite=self.univ,
            sections_admises="M,I",
        )
        ScoreHistorique.objects.create(
            filiere=self.filiere, annee=2024, section_bac="M",
            score_dernier_admis=2.58,
        )

    def test_list_gouvernorats(self):
        resp = self.client.get("/api/gouvernorats/")
        self.assertEqual(resp.status_code, 200)
        self.assertGreaterEqual(len(resp.data["results"]), 1)

    def test_list_universites(self):
        resp = self.client.get("/api/universites/")
        self.assertEqual(resp.status_code, 200)

    def test_list_filieres(self):
        resp = self.client.get("/api/filieres/")
        self.assertEqual(resp.status_code, 200)

    def test_filter_filieres_by_search(self):
        resp = self.client.get("/api/filieres/?search=Informatique")
        self.assertEqual(resp.status_code, 200)
        results = resp.data["results"]
        self.assertTrue(any("Informatique" in f["nom"] for f in results))

    def test_list_scores(self):
        resp = self.client.get("/api/scores/")
        self.assertEqual(resp.status_code, 200)

    def test_filter_scores_by_annee(self):
        resp = self.client.get("/api/scores/?annee=2024")
        self.assertEqual(resp.status_code, 200)

    def test_dashboard_stats(self):
        resp = self.client.get("/api/stats/dashboard/")
        self.assertEqual(resp.status_code, 200)
        data = resp.data
        self.assertIn("totaux", data)
        self.assertEqual(data["totaux"]["gouvernorats"], 1)
        self.assertEqual(data["totaux"]["universites"], 1)
        self.assertIn("scores_par_annee", data)
        self.assertIn("top_filieres_selectives", data)

    def test_predict_missing_filiere(self):
        resp = self.client.post(
            "/api/predict/",
            {"score": 2.5, "section_bac": "M", "filiere_code": "NOTFOUND"},
            format="json",
        )
        self.assertEqual(resp.status_code, 404)

    def test_predict_valid(self):
        resp = self.client.post(
            "/api/predict/",
            {"score": 2.5, "section_bac": "M", "filiere_code": "201"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertIn("probabilite_admission", resp.data)
        self.assertIn("conseil", resp.data)

    def test_predict_bad_input(self):
        resp = self.client.post(
            "/api/predict/",
            {"score": 5.0, "section_bac": "M", "filiere_code": "201"},
            format="json",
        )
        # Score > 4 should fail validation
        self.assertEqual(resp.status_code, 400)

    def test_chat_missing_message(self):
        resp = self.client.post("/api/chat/", {}, format="json")
        self.assertEqual(resp.status_code, 400)


# ── Prediction Service Tests ────────────────────────────────────────

class PredictionServiceTest(TestCase):
    def setUp(self):
        gov = Gouvernorat.objects.create(nom="Sousse")
        univ = Universite.objects.create(nom="ENISO", gouvernorat=gov)
        self.filiere = Filiere.objects.create(
            code="601", nom="Cycle Ingénieur Info", universite=univ,
        )
        ScoreHistorique.objects.create(
            filiere=self.filiere, annee=2023, section_bac="M",
            score_dernier_admis=2.55,
        )
        ScoreHistorique.objects.create(
            filiere=self.filiere, annee=2024, section_bac="M",
            score_dernier_admis=2.60,
        )

    def test_predict_without_model_uses_heuristic(self):
        from orientation.services.prediction import predict_admission

        result = predict_admission(score=2.80, section_bac="M", filiere_code="601")
        self.assertIn("probabilite_admission", result)
        # Score > seuil → probabilité > 0.5
        self.assertGreater(result["probabilite_admission"], 0.5)

    def test_predict_low_score(self):
        from orientation.services.prediction import predict_admission

        result = predict_admission(score=1.50, section_bac="M", filiere_code="601")
        self.assertIn("probabilite_admission", result)
        self.assertLess(result["probabilite_admission"], 0.5)

    def test_predict_unknown_filiere(self):
        from orientation.services.prediction import predict_admission

        result = predict_admission(score=2.5, section_bac="M", filiere_code="XXXX")
        self.assertIn("error", result)

    def test_build_training_data(self):
        from orientation.services.prediction import build_training_data

        df = build_training_data()
        self.assertFalse(df.empty)
        self.assertIn("score", df.columns)
        self.assertIn("admitted", df.columns)
        # Each score record produces 4 training examples
        self.assertEqual(len(df), 8)  # 2 scores × 4 examples


# ── ETL Import Tests ────────────────────────────────────────────────

class ETLImportTest(TestCase):
    def test_parse_float_helper(self):
        from orientation.management.commands.import_scores import _parse_float

        self.assertEqual(_parse_float("2.85"), 2.85)
        self.assertEqual(_parse_float("2,85"), 2.85)
        self.assertIsNone(_parse_float("-"))
        self.assertIsNone(_parse_float("N/A"))
        self.assertIsNone(_parse_float(""))

    def test_resolve_columns(self):
        from orientation.management.commands.import_scores import _resolve_columns

        headers = ["Gouvernorat", "Etablissement", "Filière", "Score_2024"]
        mapping = _resolve_columns(headers)
        self.assertIn("gouvernorat", mapping)
        self.assertIn("etablissement", mapping)
        self.assertIn("filiere", mapping)
        self.assertIn("score_2024", mapping)
