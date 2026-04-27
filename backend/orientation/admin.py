from django.contrib import admin
from .models import Gouvernorat, Universite, Filiere, ScoreHistorique, StudentProfile, AdminProfile


@admin.register(Gouvernorat)
class GouvernoratAdmin(admin.ModelAdmin):
    list_display = ("nom",)
    search_fields = ("nom",)


@admin.register(Universite)
class UniversiteAdmin(admin.ModelAdmin):
    list_display = ("nom", "gouvernorat")
    list_filter = ("gouvernorat",)
    search_fields = ("nom",)


@admin.register(Filiere)
class FiliereAdmin(admin.ModelAdmin):
    list_display = ("code", "nom", "universite", "type_diplome")
    list_filter = ("type_diplome", "universite__gouvernorat")
    search_fields = ("code", "nom")


@admin.register(ScoreHistorique)
class ScoreHistoriqueAdmin(admin.ModelAdmin):
    list_display = ("filiere", "annee", "section_bac", "score_dernier_admis")
    list_filter = ("annee", "section_bac", "filiere__universite__gouvernorat")
    search_fields = ("filiere__code", "filiere__nom")


@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "niveau_etude", "section_bac")
    search_fields = ("user__username", "user__email", "niveau_etude")


@admin.register(AdminProfile)
class AdminProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "departement")
    search_fields = ("user__username", "user__email", "departement")
