"""
Service Chatbot — Intégration OpenRouter (Mistral / Llama)
============================================================
Appelle l'API OpenRouter avec un System Prompt qui force l'IA
à répondre en tant qu'expert en orientation universitaire tunisienne,
en français et en derja tunisien.
"""
import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Tu es "EduBot", un expert en orientation universitaire tunisienne.
RÈGLES SIMPLIFIÉES :
1. Réponds UNIQUEMENT aux questions d'orientation universitaire en Tunisie (filières, scores, universités, sections du bac).
2. Réponds en français simple, très concis : 1 à 2 phrases courtes, clair et pratique.
3. Si la question est hors-sujet, réponds : "Désolé, je suis spécialisé uniquement dans l'orientation universitaire tunisienne."
4. Si tu utilises des scores, précise qu'ils sont sur 4 et peuvent varier selon l'année.

Si l'utilisateur écrit en derja tunisienne, répond brièvement en derja.
"""

# Default model — can be overridden in settings
DEFAULT_MODEL = getattr(settings, "OPENROUTER_MODEL", "mistralai/mistral-7b-instruct")


def _fallback_orientation_response(user_message: str, verbosity: str = "short") -> dict:
    """Return a basic offline chatbot response when external API is unavailable."""
    msg = (user_message or "").lower()

    # Very short fallback answers
    if any(k in msg for k in [
        "qu'est-ce", "quest ce", "qu est ce", "c'est quoi", "c est quoi",
        "de quoi", "présente", "application", "appli", "site", "plateforme",
        "edustat", "edu stat", "tu es", "qui es tu"
    ]):
        text = "Je suis EduBot. Donne ta section de bac et ton score, je te suggère des filières courtes."
    elif any(k in msg for k in ["info", "informatique", "dev", "programmation"]):
        text = "Pour l'informatique, privilégie les sections Maths ou Info et regarde les scores récents."
    elif any(k in msg for k in ["medecine", "médecine", "sante", "pharma"]):
        text = "Les filières santé demandent souvent des scores élevés; prépare des choix sécurité."
    elif any(k in msg for k in ["math", "section m", "section s", "bac", "section"]):
        text = "Dis-moi ta section et ton score pour une recommandation simple."
    else:
        text = "Je peux aider pour filières, scores et sections. Donne ta section et ton score."

    # Apply verbosity: if 'full' return raw, 'detailed' allow up to 6 sentences
    if verbosity == "full":
        resp_text = text
    elif verbosity == "detailed":
        resp_text = _simplify_text(text, max_sentences=6)
    else:
        resp_text = _simplify_text(text, max_sentences=2)

    return {
        "response": resp_text,
        "model": "fallback-local",
        "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
    }


def _simplify_text(text: str, max_sentences: int = 2) -> str:
    """Keep the first `max_sentences` sentences to enforce brevity."""
    if not text:
        return text
    import re
    parts = re.split(r'(?<=[\.\!\?])\s+', text.strip())
    return ' '.join(parts[:max_sentences]).strip()


def chat_with_bot(user_message: str, conversation_history: list | None = None, verbosity: str = "short") -> dict:
    """
    Envoie un message au chatbot via l'API OpenRouter.

    Args:
        user_message: Le message de l'utilisateur.
        conversation_history: Historique optionnel [{role, content}, …]

    Returns:
        dict avec 'response', 'model', 'usage' ou 'error'.
    """
    api_key = settings.OPENROUTER_API_KEY
    if not api_key:
        logger.warning("OPENROUTER_API_KEY missing: using local fallback chatbot response")
        return _fallback_orientation_response(user_message, verbosity=verbosity)

    # Build messages
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    if conversation_history:
        # Keep last 10 exchanges max to manage token usage
        messages.extend(conversation_history[-20:])

    messages.append({"role": "user", "content": user_message})

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://edustat-tn.vercel.app",
        "X-Title": "EduStat-TN Chatbot",
    }

    payload = {
        "model": DEFAULT_MODEL,
        "messages": messages,
        "max_tokens": 800,
        "temperature": 0.7,
        "top_p": 0.9,
    }

    try:
        response = requests.post(
            settings.OPENROUTER_BASE_URL,
            headers=headers,
            json=payload,
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()
        assistant_message = data["choices"][0]["message"]["content"]
        # Apply verbosity: 'short'->2 sentences, 'detailed'->6, 'full'->no truncation
        if verbosity == "full":
            final_message = assistant_message
        elif verbosity == "detailed":
            final_message = _simplify_text(assistant_message, max_sentences=6)
        else:
            final_message = _simplify_text(assistant_message, max_sentences=2)
        usage = data.get("usage", {})
        return {
            "response": final_message,
            "model": data.get("model", DEFAULT_MODEL),
            "usage": {
                "prompt_tokens": usage.get("prompt_tokens", 0),
                "completion_tokens": usage.get("completion_tokens", 0),
                "total_tokens": usage.get("total_tokens", 0),
            },
        }

    except requests.exceptions.Timeout:
        logger.error("OpenRouter API timeout")
        return {"error": "Le service IA est temporairement indisponible (timeout)."}
    except requests.exceptions.HTTPError as exc:
        logger.error("OpenRouter HTTP error: %s — %s", exc.response.status_code, exc.response.text)
        return {"error": f"Erreur API ({exc.response.status_code}). Réessayez plus tard."}
    except (requests.exceptions.RequestException, KeyError) as exc:
        logger.error("OpenRouter request failed: %s", exc)
        return {"error": "Impossible de contacter le service IA."}
