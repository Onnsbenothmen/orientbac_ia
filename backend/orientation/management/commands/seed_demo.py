"""
Seed demo data for local development.
Usage : python manage.py seed_demo
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from orientation.models import Gouvernorat, Universite, Filiere, ScoreHistorique


DEMO_DATA = [
    {
        "gouvernorat": "Tunis",
        "etablissements": [
            {
                "nom": "Faculté de Médecine de Tunis",
                "filieres": [
                    {"code": "101", "nom": "Médecine", "sections": "S,M", "scores": {"S": [3.15, 3.22, 3.28]}},
                    {"code": "102", "nom": "Pharmacie", "sections": "S", "scores": {"S": [3.05, 3.10, 3.15]}},
                ],
            },
            {
                "nom": "Faculté des Sciences de Tunis",
                "filieres": [
                    {"code": "201", "nom": "Licence Informatique", "sections": "M,I", "scores": {"M": [2.45, 2.52, 2.58], "I": [2.30, 2.35, 2.42]}},
                    {"code": "202", "nom": "Licence Mathématiques", "sections": "M", "scores": {"M": [2.60, 2.65, 2.70]}},
                ],
            },
            {
                "nom": "ENIT",
                "filieres": [
                    {"code": "301P", "nom": "Cycle Préparatoire Ingénieur", "sections": "M,T", "scores": {"M": [2.80, 2.85, 2.90], "T": [2.70, 2.75, 2.82]}},
                ],
            },
        ],
    },
    {
        "gouvernorat": "Sousse",
        "etablissements": [
            {
                "nom": "Faculté de Médecine de Sousse",
                "filieres": [
                    {"code": "501", "nom": "Médecine", "sections": "S", "scores": {"S": [3.00, 3.08, 3.12]}},
                    {"code": "502", "nom": "Médecine Dentaire", "sections": "S", "scores": {"S": [2.90, 2.95, 3.00]}},
                ],
            },
            {
                "nom": "ENISO",
                "filieres": [
                    {"code": "601", "nom": "Cycle Ingénieur Informatique", "sections": "M,I", "scores": {"M": [2.50, 2.55, 2.60], "I": [2.35, 2.40, 2.48]}},
                ],
            },
        ],
    },
    {
        "gouvernorat": "Sfax",
        "etablissements": [
            {
                "nom": "Faculté de Médecine de Sfax",
                "filieres": [
                    {"code": "701", "nom": "Médecine", "sections": "S", "scores": {"S": [2.95, 3.00, 3.08]}},
                ],
            },
            {
                "nom": "ENIS",
                "filieres": [
                    {"code": "801", "nom": "Cycle Préparatoire Ingénieur", "sections": "M,T", "scores": {"M": [2.55, 2.60, 2.68], "T": [2.45, 2.50, 2.58]}},
                ],
            },
        ],
    },
]

YEARS = [2022, 2023, 2024]


class Command(BaseCommand):
    help = "Insérer des données de démonstration pour le développement"

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Insertion des donnees de demo..."))

        created = {"gov": 0, "univ": 0, "fil": 0, "score": 0}

        for gov_data in DEMO_DATA:
            gov, c = Gouvernorat.objects.get_or_create(nom=gov_data["gouvernorat"])
            if c:
                created["gov"] += 1

            for etab in gov_data["etablissements"]:
                univ, c = Universite.objects.get_or_create(nom=etab["nom"], gouvernorat=gov)
                if c:
                    created["univ"] += 1

                for fil_data in etab["filieres"]:
                    filiere, c = Filiere.objects.get_or_create(
                        code=fil_data["code"],
                        defaults={
                            "nom": fil_data["nom"],
                            "universite": univ,
                            "sections_admises": fil_data["sections"],
                        },
                    )
                    if c:
                        created["fil"] += 1

                    for section, scores in fil_data["scores"].items():
                        for year, score_val in zip(YEARS, scores):
                            _, c = ScoreHistorique.objects.get_or_create(
                                filiere=filiere, annee=year, section_bac=section,
                                defaults={"score_dernier_admis": score_val},
                            )
                            if c:
                                created["score"] += 1

        self.stdout.write(self.style.SUCCESS("✅ Données de démo insérées !"))
        for k, v in created.items():
            self.stdout.write(f"   {k}: {v} créé(s)")
