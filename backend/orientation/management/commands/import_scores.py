"""
ETL Pipeline — Importation des données CSV vers PostgreSQL
============================================================
Format CSV attendu (séparateur ; ou ,) :
    Gouvernorat, Etablissement, Filière, Code_Filiere, Section_Bac,
    Score_2022, Score_2023, Score_2024

Usage :
    python manage.py import_scores --csv data/scores.csv
    python manage.py import_scores --csv data/scores.csv --dry-run
"""
import csv
import os
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from orientation.models import Gouvernorat, Universite, Filiere, ScoreHistorique


# Mapping flexible des noms de colonnes CSV → champs internes
COLUMN_ALIASES = {
    "gouvernorat": ["gouvernorat", "gov", "region"],
    "universite": ["universite", "université", "university"],
    "etablissement": ["etablissement", "université", "universite", "institution"],
    "filiere": ["filière", "filiere", "formation", "specialite"],
    "code_filiere": ["code_filiere", "code", "code_filière"],
    "section_bac": ["section_bac", "section", "bac"],
    "score_2022": ["score_2022", "score2022", "s2022"],
    "score_2023": ["score_2023", "score2023", "s2023"],
    "score_2024": ["score_2024", "score2024", "s2024"],
    "score_2025": ["score_2025", "score2025", "s2025"],
}


def _normalize(header: str) -> str:
    """Lowercase, strip accents-ish, trim."""
    return header.strip().lower().replace(" ", "_").replace("é", "e").replace("è", "e")


def _resolve_columns(headers: list[str]) -> dict[str, int]:
    """Map logical field names to column indices."""
    norm_headers = [_normalize(h) for h in headers]
    mapping: dict[str, int] = {}
    for field, aliases in COLUMN_ALIASES.items():
        for alias in aliases:
            if alias in norm_headers:
                mapping[field] = norm_headers.index(alias)
                break
    return mapping


def _parse_float(value: str) -> float | None:
    """Safely parse a float from CSV cell."""
    value = value.strip().replace(",", ".")
    if not value or value == "-" or value.lower() == "n/a":
        return None
    try:
        return float(value)
    except ValueError:
        return None


class Command(BaseCommand):
    help = "Importer les scores d'orientation depuis un fichier CSV"

    def add_arguments(self, parser):
        parser.add_argument(
            "--csv",
            type=str,
            required=True,
            help="Chemin vers le fichier CSV à importer",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Simuler l'import sans écrire en base",
        )
        parser.add_argument(
            "--delimiter",
            type=str,
            default=";",
            help="Séparateur CSV (par défaut ';')",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        csv_path = options["csv"]
        dry_run = options["dry_run"]
        delimiter = options["delimiter"]

        if not os.path.isfile(csv_path):
            raise CommandError(f"Fichier introuvable : {csv_path}")

        self.stdout.write(self.style.NOTICE(f"Lecture de {csv_path} ..."))

        stats = {
            "gouvernorats_created": 0,
            "universites_created": 0,
            "filieres_created": 0,
            "scores_created": 0,
            "scores_updated": 0,
            "rows_skipped": 0,
        }

        with open(csv_path, "r", encoding="utf-8-sig") as f:
            reader = csv.reader(f, delimiter=delimiter)
            headers = next(reader)
            col_map = _resolve_columns(headers)

            required = ["filiere"]
            # Accept multiple real-world CSV layouts where gouvernorat is missing.
            if "gouvernorat" not in col_map and "universite" not in col_map:
                required.append("gouvernorat")
            if "etablissement" not in col_map and "universite" not in col_map:
                required.append("etablissement")
            missing = [r for r in required if r not in col_map]
            if missing:
                raise CommandError(
                    f"Colonnes obligatoires manquantes : {missing}. "
                    f"Colonnes détectées : {headers}"
                )

            for row_num, row in enumerate(reader, start=2):
                if not any(cell.strip() for cell in row):
                    continue  # skip empty rows

                try:
                    if "gouvernorat" in col_map:
                        gov_name = row[col_map["gouvernorat"]].strip()
                    elif "universite" in col_map:
                        gov_name = row[col_map["universite"]].strip()
                    else:
                        gov_name = "Inconnu"

                    if "etablissement" in col_map:
                        etab_name = row[col_map["etablissement"]].strip()
                    elif "universite" in col_map:
                        etab_name = row[col_map["universite"]].strip()
                    else:
                        etab_name = "Etablissement inconnu"

                    filiere_name = row[col_map["filiere"]].strip()
                    code = row[col_map.get("code_filiere", col_map["filiere"])].strip() if "code_filiere" in col_map else ""
                    section = row[col_map["section_bac"]].strip().upper() if "section_bac" in col_map else "M"

                    if not gov_name or not etab_name or not filiere_name:
                        stats["rows_skipped"] += 1
                        continue

                    if not dry_run:
                        gov, created = Gouvernorat.objects.get_or_create(nom=gov_name)
                        if created:
                            stats["gouvernorats_created"] += 1

                        univ, created = Universite.objects.get_or_create(
                            nom=etab_name, gouvernorat=gov,
                        )
                        if created:
                            stats["universites_created"] += 1

                        filiere_code = code or f"AUTO-{row_num}"
                        filiere, created = Filiere.objects.get_or_create(
                            code=filiere_code,
                            defaults={
                                "nom": filiere_name,
                                "universite": univ,
                                "sections_admises": section,
                            },
                        )
                        if created:
                            stats["filieres_created"] += 1

                        # Import scores for each available year
                        for year_field, year_val in [
                            ("score_2022", 2022),
                            ("score_2023", 2023),
                            ("score_2024", 2024),
                            ("score_2025", 2025),
                        ]:
                            if year_field not in col_map:
                                continue
                            score_val = _parse_float(row[col_map[year_field]])
                            if score_val is None:
                                continue

                            _obj, created = ScoreHistorique.objects.update_or_create(
                                filiere=filiere,
                                annee=year_val,
                                section_bac=section,
                                defaults={"score_dernier_admis": score_val},
                            )
                            if created:
                                stats["scores_created"] += 1
                            else:
                                stats["scores_updated"] += 1
                    else:
                        self.stdout.write(
                            f"  [DRY] L{row_num}: {gov_name} | {etab_name} | {filiere_name}"
                        )

                except (IndexError, KeyError) as exc:
                    self.stderr.write(
                        self.style.WARNING(f"Ligne {row_num} ignoree : {exc}")
                    )
                    stats["rows_skipped"] += 1

        # ── Summary ──
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("Import termine !"))
        for key, val in stats.items():
            self.stdout.write(f"   {key}: {val}")

        if dry_run:
            self.stdout.write(self.style.WARNING("Mode dry-run -- aucune donnee ecrite."))
