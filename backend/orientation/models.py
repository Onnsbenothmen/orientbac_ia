"""
Modèles de données — EduStat-TN
Orientation universitaire tunisienne
"""
from django.db import models


class Gouvernorat(models.Model):
    """Gouvernorat tunisien (24 gouvernorats)."""
    nom = models.CharField(max_length=100, unique=True)

    class Meta:
        ordering = ["nom"]
        verbose_name = "Gouvernorat"
        verbose_name_plural = "Gouvernorats"

    def __str__(self):
        return self.nom


class Universite(models.Model):
    """Établissement / Université."""
    nom = models.CharField(max_length=255)
    gouvernorat = models.ForeignKey(
        Gouvernorat,
        on_delete=models.CASCADE,
        related_name="universites",
    )
    adresse = models.TextField(blank=True, default="")
    site_web = models.URLField(blank=True, default="")

    class Meta:
        ordering = ["nom"]
        verbose_name = "Université / Établissement"
        verbose_name_plural = "Universités / Établissements"
        unique_together = ["nom", "gouvernorat"]

    def __str__(self):
        return f"{self.nom} ({self.gouvernorat})"


class SectionBac(models.TextChoices):
    """Sections du Baccalauréat tunisien."""
    MATHS = "M", "Mathématiques"
    SCIENCES = "S", "Sciences Expérimentales"
    TECHNIQUE = "T", "Technique"
    ECONOMIE = "E", "Économie et Gestion"
    LETTRES = "L", "Lettres"
    INFO = "I", "Informatique"
    SPORT = "SP", "Sport"


class Filiere(models.Model):
    """Filière universitaire avec code officiel tunisien."""
    code = models.CharField(
        max_length=20,
        unique=True,
        help_text="Code filière officiel (ex: 601, 301P, …)",
    )
    nom = models.CharField(max_length=255)
    universite = models.ForeignKey(
        Universite,
        on_delete=models.CASCADE,
        related_name="filieres",
    )
    type_diplome = models.CharField(
        max_length=50,
        blank=True,
        default="Licence",
        help_text="Licence, Ingénieur, Prépa, …",
    )
    duree_annees = models.PositiveSmallIntegerField(default=3)
    sections_admises = models.CharField(
        max_length=50,
        blank=True,
        default="",
        help_text="Sections bac admises, séparées par des virgules (M,S,T…)",
    )

    class Meta:
        ordering = ["code"]
        verbose_name = "Filière"
        verbose_name_plural = "Filières"

    def __str__(self):
        return f"[{self.code}] {self.nom} — {self.universite.nom}"


class ScoreHistorique(models.Model):
    """Score du dernier admis par filière, année et section bac."""
    filiere = models.ForeignKey(
        Filiere,
        on_delete=models.CASCADE,
        related_name="scores",
    )
    annee = models.PositiveIntegerField(
        help_text="Année d'admission (ex : 2023)",
    )
    section_bac = models.CharField(
        max_length=3,
        choices=SectionBac.choices,
        help_text="Section du baccalauréat",
    )
    score_dernier_admis = models.FloatField(
        help_text="Score (sur 4) du dernier admis",
    )
    score_premier_admis = models.FloatField(
        null=True,
        blank=True,
        help_text="Score (sur 4) du premier admis (optionnel)",
    )
    nombre_places = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Nombre de places offertes",
    )

    class Meta:
        ordering = ["-annee", "filiere"]
        verbose_name = "Score historique"
        verbose_name_plural = "Scores historiques"
        unique_together = ["filiere", "annee", "section_bac"]

    def __str__(self):
        return (
            f"{self.filiere.code} | {self.annee} | "
            f"{self.get_section_bac_display()} → {self.score_dernier_admis}"
        )
