"""Serializers for the orientation API."""
from rest_framework import serializers
from .models import Gouvernorat, Universite, Filiere, ScoreHistorique


class GouvernoratSerializer(serializers.ModelSerializer):
    class Meta:
        model = Gouvernorat
        fields = "__all__"


class UniversiteSerializer(serializers.ModelSerializer):
    gouvernorat_nom = serializers.CharField(source="gouvernorat.nom", read_only=True)

    class Meta:
        model = Universite
        fields = ["id", "nom", "gouvernorat", "gouvernorat_nom", "adresse", "site_web"]


class FiliereSerializer(serializers.ModelSerializer):
    universite_nom = serializers.CharField(source="universite.nom", read_only=True)
    gouvernorat = serializers.CharField(
        source="universite.gouvernorat.nom", read_only=True
    )

    class Meta:
        model = Filiere
        fields = [
            "id", "code", "nom", "universite", "universite_nom",
            "gouvernorat", "type_diplome", "duree_annees", "sections_admises",
        ]


class ScoreHistoriqueSerializer(serializers.ModelSerializer):
    filiere_code = serializers.CharField(source="filiere.code", read_only=True)
    filiere_nom = serializers.CharField(source="filiere.nom", read_only=True)

    class Meta:
        model = ScoreHistorique
        fields = [
            "id", "filiere", "filiere_code", "filiere_nom",
            "annee", "section_bac", "score_dernier_admis",
            "score_premier_admis", "nombre_places",
        ]


class PredictionInputSerializer(serializers.Serializer):
    """Input for the admission prediction endpoint."""
    score = serializers.FloatField(
        min_value=0, max_value=200,
        help_text="Score du bachelier (barème réel, ex: 130)",
    )
    section_bac = serializers.CharField(
        max_length=3,
        help_text="Code section bac (M, S, T, E, L, I, SP)",
    )
    filiere_code = serializers.CharField(
        max_length=20,
        help_text="Code de la filière visée",
    )


class PredictionOutputSerializer(serializers.Serializer):
    """Output of the admission prediction."""
    filiere_code = serializers.CharField()
    filiere_nom = serializers.CharField()
    probabilite_admission = serializers.FloatField()
    score_dernier_admis_precedent = serializers.FloatField(allow_null=True)
    conseil = serializers.CharField()


class RecommendationInputSerializer(serializers.Serializer):
    """Input for multi-filiere recommendation endpoint."""
    score = serializers.FloatField(
        min_value=0, max_value=200,
        help_text="Score du bachelier (barème réel, ex: 130)",
    )
    section_bac = serializers.CharField(
        max_length=3,
        help_text="Code section bac (M, S, T, E, L, I, SP)",
    )
    limit = serializers.IntegerField(
        min_value=1,
        max_value=30,
        required=False,
        default=10,
        help_text="Nombre maximal de filières recommandées",
    )
    type_diplome = serializers.CharField(required=False, allow_blank=True, help_text="Filtrer par type de diplôme (e.g. Licence, Ingenieur)")


class RecommendationItemSerializer(serializers.Serializer):
    filiere_code = serializers.CharField()
    filiere_nom = serializers.CharField()
    universite_nom = serializers.CharField()
    gouvernorat = serializers.CharField(allow_blank=True)
    type_diplome = serializers.CharField(allow_blank=True)
    score_min = serializers.FloatField()
    score_moyen = serializers.FloatField()
    score_max = serializers.FloatField()
    dernier_seuil = serializers.FloatField()
    marge = serializers.FloatField()
    probabilite_estimee = serializers.FloatField()
    niveau = serializers.CharField()


class ChatMessageSerializer(serializers.Serializer):
    """Input for the chatbot endpoint."""
    message = serializers.CharField(max_length=2000)
    conversation_id = serializers.CharField(required=False, default="")
    verbosity = serializers.ChoiceField(
        choices=[("short", "short"), ("detailed", "detailed"), ("full", "full")],
        required=False,
        default="short",
        help_text="Contrôle la longueur de la réponse: 'short' (1-2 phrases) ou 'detailed' (plus complète) ou 'full' (non tronquée).",
    )
