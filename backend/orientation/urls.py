"""URL routing for the orientation API."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r"gouvernorats", views.GouvernoratViewSet)
router.register(r"universites", views.UniversiteViewSet)
router.register(r"filieres", views.FiliereViewSet)
router.register(r"scores", views.ScoreHistoriqueViewSet)

urlpatterns = [
    path("", include(router.urls)),
    path("stats/dashboard/", views.dashboard_stats, name="dashboard-stats"),
    path("predict/", views.prediction_view, name="predict"),
    path("recommendations/", views.recommendations_view, name="recommendations"),
    path("chat/", views.chatbot_view, name="chat"),
    path("filieres/<str:code>/history/", views.filiere_history_view, name="filiere-history"),
    path("health/", views.health_check, name="health-check"),
]
