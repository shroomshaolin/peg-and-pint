from fastapi.responses import JSONResponse
import inspect
import re


def _clean_text(value="", limit=4000):
    text = str(value or "").replace("\x00", " ").strip()
    text = re.sub(r"\s+", " ", text)
    return text[:limit].strip()


def _persona_brief(name=""):
    key = _clean_text(name, 80).lower()
    briefs = {
        "elias": "Elias is poetic, sly, mystical, dry-witted, and a little theatrical. He enjoys turning math into moral drama.",
        "riley": "Riley is sharp, skeptical, funny, observant, and scientifically minded. She likes clean logic and precise little victories.",
        "dawn": "Dawn is perceptive, luminous, calm, and quietly uncanny. She notices emotional currents under ordinary events.",
        "fox": "Fox is wary, clever, suspicious, dryly funny, and hard to impress. He watches everything.",
        "einstein": "Einstein is playful, curious, brilliant, warm, and prone to turning simple moments into thought experiments.",
        "claude": "Claude is thoughtful, courteous, analytical, and gently witty, with a careful sense of language.",
        "info sage": "Info Sage is warm, clever, encouraging, cosmic, and lightly mischievous.",
        "the pub shark": "The Pub Shark is charming, ruthless at cards, jovial, and suspiciously good at counting.",
    }
    return briefs.get(key) or f"{name} is a Sapphire persona at a warm tavern cribbage table."


async def _get_payload(body=None, request=None):
    if isinstance(body, dict):
        return body

    if request is not None:
        try:
            data = await request.json()
            if isinstance(data, dict):
                return data
        except Exception:
            return {}

    return {}


def _extract_reply_text(payload):
    if payload is None:
        return ""

    if isinstance(payload, str):
        return payload.strip()

    if isinstance(payload, dict):
        candidates = [
            payload.get("response"),
            payload.get("reply"),
            payload.get("text"),
            payload.get("content"),
            payload.get("message"),
            payload.get("answer"),
            payload.get("output"),
            payload.get("result"),
        ]

        try:
            candidates.append(payload.get("choices", [{}])[0].get("message", {}).get("content"))
        except Exception:
            pass

        try:
            candidates.append(payload.get("choices", [{}])[0].get("text"))
        except Exception:
            pass

        for item in candidates:
            if isinstance(item, str) and item.strip():
                return item.strip()

            if isinstance(item, list):
                joined = []
                for part in item:
                    if isinstance(part, str):
                        joined.append(part)
                    elif isinstance(part, dict):
                        joined.append(str(part.get("text") or part.get("content") or ""))
                text = " ".join(joined).strip()
                if text:
                    return text

    return str(payload or "").strip()


def _clean_generated_banter(text="", speaker=""):
    out = str(text or "").strip()

    out = re.sub(r"<think>[\s\S]*?</think>", " ", out, flags=re.I)
    out = re.sub(r"```[\s\S]*?```", " ", out)

    # Drop model private-thought leakage.
    out = re.sub(r"\b(?:inner thoughts?|private thoughts?|thought|analysis|aside)\s*[:\-][\s\S]*$", " ", out, flags=re.I)

    lines = []
    for line in re.split(r"\n+", out):
        line = line.strip()
        if not line:
            continue
        if re.match(r"^(?:inner thoughts?|private thoughts?|thoughts?|thought|internal monologue|analysis|aside)\s*[:\-]", line, flags=re.I):
            continue
        if re.match(r"^\(.*\)$", line) or re.match(r"^\[.*\]$", line):
            continue
        lines.append(line)

    out = " ".join(lines).strip()

    if speaker:
        escaped = re.escape(str(speaker))
        out = re.sub(r"^" + escaped + r"\s*:\s*", "", out, flags=re.I).strip()

        # Narrow identity-bleed cleanup:
        # keep normal table talk, but remove claims like
        # "I'm not Claude — I'm Dawn."
        out = re.sub(
            r"\b(?:but\s+)?I\s*(?:am|'m)\s+not\s+" + escaped + r"\s*[—–-]\s*I\s*(?:am|'m)\s+[^.!?]+[.!?]?",
            " ",
            out,
            flags=re.I,
        )
        out = re.sub(
            r"\bI\s*(?:am|'m)\s+not\s+" + escaped + r"\b[^.!?]*[.!?]?",
            " ",
            out,
            flags=re.I,
        )

    if speaker:
        escaped = re.escape(str(speaker))
        # Remove direct identity bleed even when the model uses curly apostrophes or reversed wording.
        identity_patterns = [
            r"\b(?:but\s+)?I\s*(?:am|'m|’m)\s+not\s+" + escaped + r"\s*[—–-]\s*I\s*(?:am|'m|’m)\s+[^.!?]+[.!?]?",
            r"\bI\s*(?:am|'m|’m)\s+not\s+" + escaped + r"\b[^.!?]*[.!?]?",
            r"\bI\s*(?:am|'m|’m)\s+(?:Dawn|Donna)\b[^.!?]*[.!?]?",
            r"\bI\s*(?:am|'m|’m)\s+here\s+(?:as|with you as)\s+(?:Dawn|Donna)\b[^.!?]*[.!?]?",
            r"\bas\s+(?:Dawn|Donna)\b[^.!?]*[.!?]?",
            r"\bnot\s+" + escaped + r"\b[^.!?]*\b(?:Dawn|Donna)\b[^.!?]*[.!?]?",
        ]
        for pat in identity_patterns:
            out = re.sub(pat, " ", out, flags=re.I)

    out = re.sub(r"<[^>]+>", " ", out)
    out = re.sub(r"\s+", " ", out).strip()
    out = out.strip("\"“”'")

    return out[:700].strip()


def _bad_identity_or_refusal(text="", speaker=""):
    out = str(text or "")
    name = re.escape(str(speaker or "").strip())

    if re.search(r"\bno\s+cribbage\s+(?:tonight|today|now)\b", out, flags=re.I):
        return True

    if name and re.search(r"\bI\s*(?:am|'m|’m)\s+not\s+" + name + r"\b", out, flags=re.I):
        return True

    if re.search(r"\bI\s*(?:am|'m|’m)\s+(?:Dawn|Donna)\b", out, flags=re.I):
        return True

    if re.search(r"\bI\s*(?:am|'m|’m)\s+here\s+(?:as|with you as)\s+(?:Dawn|Donna)\b", out, flags=re.I):
        return True

    if re.search(r"\bas\s+(?:Dawn|Donna)\b", out, flags=re.I):
        return True

    return False


def _fallback_banter_line(event_text="", other=""):
    event = str(event_text or "").lower()
    other = str(other or "friend").strip() or "friend"

    if "crib" in event and "discard" in event:
        return f"Two to the crib, then. The table is set — your move, {other}."
    if "pair" in event:
        return f"Pair on the table. Nice little bite of points — your play, {other}."
    if "fifteen" in event:
        return f"Fifteen keeps the table honest. Your move, {other}."
    if "go" in event:
        return "Go it is. The count resets, and the table keeps moving."
    if "scores no" in event or "no pegging points" in event:
        return f"No points there, but the hand is still alive. Your play, {other}."

    return f"Still in the game, {other}. Let’s keep the cards moving."


async def _isolated_chat(prompt):
    """
    Use Sapphire's internal isolated model path.
    Do not call /api/chat here; that route can write to the visible active chat.
    """
    import importlib

    errors = []
    system_obj = None

    # Best path for this Sapphire build:
    # core.api_fastapi exposes get_system()/set_system(), not a public system variable.
    try:
        api = importlib.import_module("core.api_fastapi")
        get_system = getattr(api, "get_system", None)

        if callable(get_system):
            candidate = get_system()
            if candidate is not None and getattr(getattr(candidate, "llm_chat", None), "isolated_chat", None):
                system_obj = candidate
            else:
                errors.append("core.api_fastapi.get_system(): returned no usable llm_chat.isolated_chat")
        else:
            errors.append("core.api_fastapi.get_system: not callable")
    except Exception as e:
        errors.append(f"core.api_fastapi.get_system: {e}")

    # Fallbacks for other Sapphire shapes.
    if system_obj is None:
        candidates = [
            ("main", "get_system"),
            ("sapphire", "get_system"),
            ("core.api_fastapi", "_system"),
            ("main", "_system"),
            ("sapphire", "_system"),
        ]

        for module_name, attr in candidates:
            try:
                module = importlib.import_module(module_name)
                value = getattr(module, attr, None)

                candidate = value() if callable(value) and attr == "get_system" else value

                if candidate is None:
                    errors.append(f"{module_name}.{attr}: None")
                    continue

                llm_chat = getattr(candidate, "llm_chat", None)
                isolated_chat = getattr(llm_chat, "isolated_chat", None)

                if isolated_chat:
                    system_obj = candidate
                    break

                errors.append(f"{module_name}.{attr}: no llm_chat.isolated_chat")
            except Exception as e:
                errors.append(f"{module_name}.{attr}: {e}")

    if system_obj is None:
        raise RuntimeError("Could not locate Sapphire isolated_chat. Tried: " + " | ".join(errors[:10]))

    chat_fn = system_obj.llm_chat.isolated_chat

    try:
        result = chat_fn(
            prompt,
            task_settings={
                "temperature": 0.85,
                "max_tokens": 180,
            },
        )
    except TypeError:
        try:
            result = chat_fn(prompt, task_settings={})
        except TypeError:
            result = chat_fn(prompt)

    if inspect.isawaitable(result):
        result = await result

    text = _extract_reply_text(result)
    if not text:
        raise RuntimeError("isolated_chat returned no usable text")

    return text


async def handle_post_banter(request=None, body=None, settings=None, **kwargs):
    payload = await _get_payload(body=body, request=request)

    side = _clean_text(payload.get("side") or "left", 20).lower()
    event_text = _clean_text(payload.get("eventText") or payload.get("event_text") or "", 3000)
    left_persona = _clean_text(payload.get("leftPersona") or "Elias", 80)
    right_persona = _clean_text(payload.get("rightPersona") or "Riley", 80)

    if not event_text:
        return JSONResponse({"ok": False, "error": "No event text provided"}, status_code=400)

    speaker = right_persona if side == "right" else left_persona
    other = left_persona if side == "right" else right_persona

    prompt = "\n".join([
        f"You are {speaker}, seated at The Peg and Pint, a warm tavern cribbage table.",
        _persona_brief(speaker),
        f"{other} is across the table.",
        "",
        "React naturally to this exact cribbage event:",
        event_text,
        "",
        "Important rules:",
        "- Do not invent cards, scores, rules, game actions, or outcomes.",
        "- Do not repeat the official scoring unless it feels natural.",
        "- Do not include your name as a speaker label.",
        f"- Stay as {speaker}. You may talk naturally, but do not claim to be {other}, Dawn, Donna, the human player, or any other named persona unless that is your selected name.",
        "- Absolutely no inner thoughts, private thoughts, analysis, narration, brackets, asides, or stage directions.",
        "- Write only spoken dialogue the character would say out loud at the table.",
        "- If you are tempted to include an inner thought, omit it completely.",
        "- Do not mention being an AI or model.",
        "- Give 1 to 3 natural sentences.",
        "- Keep the game moving.",
    ])

    try:
        raw = await _isolated_chat(prompt)
        text = _clean_generated_banter(raw, speaker)

        if _bad_identity_or_refusal(text, speaker):
            text = _fallback_banter_line(event_text, other)

        if not text:
            return JSONResponse({"ok": False, "error": "Empty cleaned banter"}, status_code=502)

        return JSONResponse({
            "ok": True,
            "text": text,
            "speaker": speaker,
            "side": side,
        })

    except Exception as e:
        return JSONResponse({"ok": False, "error": str(e)}, status_code=500)
