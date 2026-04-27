"""
ETL Standalone — Importation des données CSV
==============================================
Script utilisable sans Django pour nettoyer et valider le CSV.

Usage :
    python etl_standalone.py --csv 
"""
import argparse
import csv
import sys
from pathlib import Path


EXPECTED_HEADERS = [
    "Gouvernorat", "Etablissement", "Filière", "Code_Filiere",
    "Section_Bac", "Score_2022", "Score_2023", "Score_2024",
]

VALID_SECTIONS = {"M", "S", "T", "E", "L", "I", "SP"}

GOUVERNORATS_TN = {
    "Tunis", "Ariana", "Ben Arous", "Manouba",
    "Nabeul", "Zaghouan", "Bizerte", "Béja",
    "Jendouba", "Le Kef", "Siliana", "Sousse",
    "Monastir", "Mahdia", "Sfax", "Kairouan",
    "Kasserine", "Sidi Bouzid", "Gabès", "Médenine",
    "Tataouine", "Gafsa", "Tozeur", "Kébili",
}


def parse_float(value: str) -> float | None:
    value = value.strip().replace(",", ".")
    if not value or value in ("-", "N/A", "n/a"):
        return None
    try:
        return float(value)
    except ValueError:
        return None


def validate_row(row: dict, row_num: int) -> list[str]:
    """Retourne une liste d'avertissements pour une ligne."""
    warnings = []

    if not row.get("Gouvernorat", "").strip():
        warnings.append(f"L{row_num}: Gouvernorat manquant")

    if not row.get("Etablissement", "").strip():
        warnings.append(f"L{row_num}: Établissement manquant")

    if not row.get("Filière", "").strip():
        warnings.append(f"L{row_num}: Filière manquante")

    section = row.get("Section_Bac", "").strip().upper()
    if section and section not in VALID_SECTIONS:
        warnings.append(f"L{row_num}: Section '{section}' invalide (attendu: {VALID_SECTIONS})")

    # Validate scores are in [0, 4]
    for year in ("Score_2022", "Score_2023", "Score_2024"):
        val = parse_float(row.get(year, ""))
        if val is not None and (val < 0 or val > 4):
            warnings.append(f"L{row_num}: {year}={val} hors intervalle [0, 4]")

    return warnings


def run_etl(csv_path: str, output_path: str | None, delimiter: str = ";"):
    path = Path(csv_path)
    if not path.is_file():
        print(f"Fichier introuvable : {csv_path}", file=sys.stderr)
        sys.exit(1)

    stats = {
        "total_rows": 0,
        "valid_rows": 0,
        "warnings": 0,
        "gouvernorats": set(),
        "etablissements": set(),
        "filieres": set(),
    }
    all_warnings: list[str] = []
    clean_rows: list[dict] = []

    with open(path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f, delimiter=delimiter)
        headers = reader.fieldnames or []
        print(f"Colonnes detectees : {headers}")

        for row_num, row in enumerate(reader, start=2):
            stats["total_rows"] += 1
            warnings = validate_row(row, row_num)

            if warnings:
                all_warnings.extend(warnings)
                stats["warnings"] += len(warnings)
            else:
                stats["valid_rows"] += 1
                clean_rows.append(row)
                stats["gouvernorats"].add(row["Gouvernorat"].strip())
                stats["etablissements"].add(row["Etablissement"].strip())
                stats["filieres"].add(row.get("Code_Filiere", row["Filière"]).strip())

    # Print report
    print("\n" + "=" * 50)
    print("RAPPORT ETL")
    print("=" * 50)
    print(f"  Lignes totales     : {stats['total_rows']}")
    print(f"  Lignes valides     : {stats['valid_rows']}")
    print(f"  Avertissements     : {stats['warnings']}")
    print(f"  Gouvernorats       : {len(stats['gouvernorats'])}")
    print(f"  Établissements     : {len(stats['etablissements'])}")
    print(f"  Filières uniques   : {len(stats['filieres'])}")

    if all_warnings:
        print(f"\nAvertissements ({len(all_warnings)}) :")
        for w in all_warnings[:20]:
            print(f"   {w}")
        if len(all_warnings) > 20:
            print(f"   … et {len(all_warnings) - 20} de plus")

    # Write cleaned CSV
    if output_path and clean_rows:
        out = Path(output_path)
        out.parent.mkdir(parents=True, exist_ok=True)
        with open(out, "w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=headers, delimiter=delimiter)
            writer.writeheader()
            writer.writerows(clean_rows)
        print(f"\nCSV nettoye ecrit -> {output_path} ({len(clean_rows)} lignes)")
    elif not clean_rows:
        print("\nAucune ligne valide a exporter.")

    return stats


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ETL — Nettoyage CSV EduStat-TN")
    parser.add_argument("--csv", required=True, help="Chemin du CSV source")
    parser.add_argument("--output", default=None, help="Chemin du CSV nettoyé (optionnel)")
    parser.add_argument("--delimiter", default=";", help="Séparateur CSV (défaut: ;)")
    args = parser.parse_args()

    run_etl(args.csv, args.output, args.delimiter)
