"""Serializers for the orientation API."""
from django.core.exceptions import ValidationError as DjangoValidationError
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from .models import (
    AdminProfile,
    Filiere,
    Gouvernorat,
    ScoreHistorique,
    SectionBac,
    StudentProfile,
    Universite,
    UserRole,
)


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


class SignUpSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField(required=False, allow_blank=True)
    password = serializers.CharField(min_length=8, write_only=True)
    password_confirm = serializers.CharField(min_length=8, write_only=True)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Ce nom d'utilisateur existe deja.")
        return value

    def validate_email(self, value):
        if value and User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Cet email existe deja.")
        return value

    def validate(self, attrs):
        if attrs.get("password") != attrs.get("password_confirm"):
            raise serializers.ValidationError({"password_confirm": "Les mots de passe ne correspondent pas."})
        try:
            validate_password(attrs.get("password", ""))
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": list(exc.messages)})
        return attrs


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True)


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(min_length=8, write_only=True)
    new_password_confirm = serializers.CharField(min_length=8, write_only=True)

    def validate(self, attrs):
        if attrs.get("new_password") != attrs.get("new_password_confirm"):
            raise serializers.ValidationError({"new_password_confirm": "Les mots de passe ne correspondent pas."})
        try:
            validate_password(attrs.get("new_password", ""))
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"new_password": list(exc.messages)})
        return attrs


class ProfileSerializer(serializers.Serializer):
    username = serializers.CharField(read_only=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    role = serializers.ChoiceField(choices=UserRole.choices, read_only=True)
    niveau_etude = serializers.CharField(max_length=100, required=False, allow_blank=True)
    section_bac = serializers.CharField(max_length=3, required=False, allow_blank=True)
    departement = serializers.CharField(max_length=120, required=False, allow_blank=True)


class AuthResponseSerializer(serializers.Serializer):
    token = serializers.CharField()
    user = ProfileSerializer()


def serialize_user_profile(user: User) -> dict:
    role = UserRole.ADMIN if hasattr(user, "admin_profile") else UserRole.ETUDIANT
    payload = {
        "username": user.username,
        "email": user.email or "",
        "first_name": user.first_name or "",
        "last_name": user.last_name or "",
        "role": role,
        "niveau_etude": "",
        "section_bac": "",
        "departement": "",
    }
    if hasattr(user, "student_profile"):
        payload["niveau_etude"] = user.student_profile.niveau_etude
        payload["section_bac"] = user.student_profile.section_bac
    if hasattr(user, "admin_profile"):
        payload["departement"] = user.admin_profile.departement
    return payload


def ensure_profile_for_role(user: User, role: str) -> None:
    if role == UserRole.ADMIN:
        AdminProfile.objects.get_or_create(user=user, defaults={"role": UserRole.ADMIN})
        StudentProfile.objects.filter(user=user).delete()
        user.is_staff = True
    else:
        StudentProfile.objects.get_or_create(user=user, defaults={"role": UserRole.ETUDIANT})
        AdminProfile.objects.filter(user=user).delete()
        user.is_staff = False
    user.save(update_fields=["is_staff"])
