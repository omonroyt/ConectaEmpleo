"""Verificación de punta a punta de B9 (matching determinista) y B10
(marketplace, anonimización, desbloqueo) contra un servidor real (uvicorn),
con `DeterministicAdapter` (cero tokens de LLM).

Uso (con el servidor ya corriendo en :8000, ver comando abajo):

    uvicorn app.main:app --port 8000 &
    DATABASE_URL="postgresql+psycopg://conecta:conecta@localhost:5433/conecta" \
        .venv/Scripts/python.exe scripts/verify_b9_b10.py http://127.0.0.1:8000

No usa `TestClient` ni los fixtures de pytest a propósito: el job `MATCH_RUN`
(igual que `INTERVIEW_EVALUATE`/`PROFILE_BUILD` en B6/B7) corre en
`BackgroundTasks` con su propia `SessionLocal()`, que no ve datos de una
transacción de prueba sin comitear -- necesita un proceso HTTP real con
commits reales.
"""

from __future__ import annotations

import sys
import time
import uuid

import httpx

passed = 0
failed: list[str] = []


def check(label: str, condition: bool, detail: str = "") -> None:
    global passed
    if condition:
        passed += 1
        print(f"  OK  {label}" + (f" -> {detail}" if detail else ""))
    else:
        failed.append(label)
        print(f"  FALLA  {label}" + (f" -> {detail}" if detail else ""))


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


LEVEL4 = " ".join(["Reviso", "verifico", "documento", "comunico", "coordino"] * 6)
LEVEL2 = " ".join(["Reviso", "avanzo", "colaboro", "reviso", "avanzo", "colaboro", "reviso", "avanzo"])


def run_interview(client: httpx.Client, token: str, interview_id: str, hard_answer: str, soft_answer: str) -> None:
    finished = False
    guard = 0
    while not finished and guard < 80:
        guard += 1
        next_resp = client.get(f"/api/v1/interviews/{interview_id}/next-question", headers=auth(token)).json()
        if next_resp["finished"]:
            finished = True
            break
        turn = next_resp["turn"]
        if turn["is_follow_up"]:
            answer_text = "Ya lo mencioné antes, gracias."
        else:
            answer_text = hard_answer if turn["block"] == "HARD" else soft_answer
        ans = client.post(
            f"/api/v1/interviews/{interview_id}/answers",
            json={"answer_text": answer_text, "mode": "TEXT"},
            headers=auth(token),
        ).json()
        if ans["finished"]:
            finished = True
    check(f"entrevista {interview_id} termina dentro del límite de seguridad", finished)


def wait_job(client: httpx.Client, job_id: str, *, timeout_s: float = 30.0) -> dict:
    started = time.monotonic()
    while time.monotonic() - started < timeout_s:
        job = client.get(f"/api/v1/jobs/{job_id}").json()
        if job["status"] in ("DONE", "FAILED"):
            return job
        time.sleep(0.3)
    raise TimeoutError(f"job {job_id} no terminó en {timeout_s}s")


def make_evaluated_candidate(
    client: httpx.Client, *, stamp: str, tag: str, family_id: str, hard_answer: str, soft_answer: str,
    city: str, state: str, salary_min: int, salary_max: int,
) -> tuple[str, str]:
    email = f"cand-{tag}-{stamp}@demo.mx"
    resp = client.post("/api/v1/auth/register", json={"email": email, "password": "demo1234", "role": "CANDIDATE"})
    check(f"registro candidato {tag}", resp.status_code == 201, f"HTTP {resp.status_code}")
    token = resp.json()["access_token"]

    fam_resp = client.post("/api/v1/candidates/me/job-family", json={"job_family_id": family_id}, headers=auth(token))
    check(f"job-family candidato {tag}", fam_resp.status_code == 200)
    candidate_id = fam_resp.json()["id"]

    patch_resp = client.patch(
        "/api/v1/candidates/me",
        json={
            "location": {"city": city, "state": state},
            "salary_expectation_min": salary_min,
            "salary_expectation_max": salary_max,
            "availability": "IMMEDIATE",
        },
        headers=auth(token),
    )
    check(f"patch perfil candidato {tag}", patch_resp.status_code == 200)

    interview_resp = client.post("/api/v1/interviews", json={"mode": "TEXT"}, headers=auth(token))
    check(f"crear entrevista candidato {tag}", interview_resp.status_code == 201)
    interview_id = interview_resp.json()["id"]

    run_interview(client, token, interview_id, hard_answer, soft_answer)

    complete_resp = client.post(f"/api/v1/interviews/{interview_id}/complete", headers=auth(token))
    check(f"POST complete candidato {tag}", complete_resp.status_code == 202, f"HTTP {complete_resp.status_code}")
    job_id = complete_resp.json()["job_id"]
    job = wait_job(client, job_id)
    check(f"job INTERVIEW_EVALUATE candidato {tag} DONE", job["status"] == "DONE", str(job))

    # PROFILE_BUILD se encadena internamente (ver app/modules/assessments/jobs.py);
    # se espera un poco a que el candidato quede EVALUATED antes de seguir.
    status = None
    for _ in range(40):
        status = client.get("/api/v1/candidates/me/status", headers=auth(token)).json()
        if status["status"] == "EVALUATED":
            break
        time.sleep(0.3)
    check(f"candidato {tag} queda EVALUATED", status is not None and status["status"] == "EVALUATED", str(status))

    return token, candidate_id


def main() -> int:
    base_url = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000"
    client = httpx.Client(base_url=base_url, timeout=30.0)
    stamp = uuid.uuid4().hex[:8]

    print("\n=== B9/B10 · empresa y vacante ===")
    company_email = f"empresa-{stamp}@demo.mx"
    resp = client.post("/api/v1/auth/register", json={"email": company_email, "password": "demo1234", "role": "COMPANY"})
    check("registro de empresa", resp.status_code == 201, f"HTTP {resp.status_code}")
    company_token = resp.json()["access_token"]

    families = client.get("/api/v1/job-families").json()
    admin_family = next(f for f in families if f["code"] == "ADMIN_ASSISTANT")

    vac_resp = client.post(
        "/api/v1/vacancies",
        json={
            "job_family_id": admin_family["id"],
            "title": "Auxiliar administrativo (verificación B9/B10)",
            "description": "Vacante real de verificación end-to-end.",
            "location": {"city": "León", "state": "Guanajuato"},
            "work_mode": "ONSITE",
            "salary_min": 9000,
            "salary_max": 13000,
            "positions_count": 1,
        },
        headers=auth(company_token),
    )
    check("crear vacante", vac_resp.status_code == 201, f"HTTP {vac_resp.status_code}")
    vacancy_id = vac_resp.json()["id"]

    req_resp = client.put(
        f"/api/v1/vacancies/{vacancy_id}/requirements",
        json=[
            {
                "competency_code": "ADMIN_HA_01",
                "skill_code": None,
                "label": "Dominio avanzado de Excel",
                "kind": "MANDATORY",
                "min_level": 4,
                "weight": 40,
            }
        ],
        headers=auth(company_token),
    )
    check("fijar requisitos", req_resp.status_code == 200, f"HTTP {req_resp.status_code}")

    open_resp = client.patch(f"/api/v1/vacancies/{vacancy_id}", json={"status": "OPEN"}, headers=auth(company_token))
    check("abrir vacante", open_resp.status_code == 200)

    print("\n=== B9/B10 · 3 candidatos EVALUATED de la misma familia ===")
    token_a, candidate_a = make_evaluated_candidate(
        client, stamp=stamp, tag="a", family_id=admin_family["id"], hard_answer=LEVEL4, soft_answer=LEVEL4,
        city="León", state="Guanajuato", salary_min=9000, salary_max=13000,
    )
    token_b, candidate_b = make_evaluated_candidate(
        client, stamp=stamp, tag="b", family_id=admin_family["id"], hard_answer=LEVEL4, soft_answer=LEVEL2,
        city="León", state="Guanajuato", salary_min=9500, salary_max=12500,
    )
    token_c, candidate_c = make_evaluated_candidate(
        client, stamp=stamp, tag="c", family_id=admin_family["id"], hard_answer=LEVEL2, soft_answer=LEVEL2,
        city="Monterrey", state="Nuevo León", salary_min=30000, salary_max=35000,
    )

    print("\n=== B9 · POST /vacancies/{id}/match-runs ===")
    run_resp = client.post(f"/api/v1/vacancies/{vacancy_id}/match-runs", headers=auth(company_token))
    check("match-run 202", run_resp.status_code == 202, f"HTTP {run_resp.status_code} {run_resp.text}")
    match_job_id = run_resp.json()["job_id"]
    match_job = wait_job(client, match_job_id)
    check("job MATCH_RUN DONE", match_job["status"] == "DONE", str(match_job))
    match_run_id = match_job["result_ref"]
    print(f"  match_run_id = {match_run_id}")

    print("\n=== B9 · GET /match-runs/{id}/results ===")
    results_resp = client.get(f"/api/v1/match-runs/{match_run_id}/results", headers=auth(company_token))
    check("resultados 200", results_resp.status_code == 200)
    payload = results_resp.json()
    # >= 3, no ==: contra un Postgres real (no una transacción de prueba con
    # rollback) los candidatos EVALUATED de corridas anteriores del propio
    # script siguen ahí y son legítimamente elegibles (RB-01) -- el run
    # real agrega a todos los EVALUATED de la familia, como debe ser.
    check("al menos 3 candidatos evaluados (los 3 recién creados)", payload["total"] >= 3, str(payload["total"]))
    cards = payload["items"]
    scores = [c["total_score"] for c in cards]
    check("ranking ordenado desc", scores == sorted(scores, reverse=True), str(scores))
    print("  Ranking real:")
    for c in cards:
        print(
            f"    #{c['rank_position']} {c['anon_code']} total={c['total_score']} "
            f"penalties={[p['reason'] for p in c['penalties']]} gaps={c['gaps']}"
        )
    for forbidden in ("full_name", "photo_url", "birth_date", "gender"):
        check(f"'{forbidden}' ausente de la respuesta HTTP", forbidden not in results_resp.text)

    top = cards[0]
    print("\n=== B10 · GET /match-results/{id} (A5 EXPLAIN) ===")
    detail_resp = client.get(f"/api/v1/match-results/{top['match_result_id']}", headers=auth(company_token))
    check("detalle 200", detail_resp.status_code == 200)
    detail = detail_resp.json()
    print(f"  explanation_text: {detail['explanation_text']!r}")
    import re

    percentages = [float(m) for m in re.findall(r"(\d+(?:\.\d+)?)\s*%", detail["explanation_text"])]
    check("explicación no menciona un % distinto de total_score", all(p == detail["total_score"] for p in percentages), str(percentages))

    print("\n=== B10 · unlock / full ===")
    full_before = client.get(f"/api/v1/match-results/{top['match_result_id']}/full", headers=auth(company_token))
    check("full antes de unlock -> 403 UNLOCK_REQUIRED", full_before.status_code == 403, full_before.text)

    unlock_resp = client.post(f"/api/v1/match-results/{top['match_result_id']}/unlock", headers=auth(company_token))
    check("unlock 200", unlock_resp.status_code == 200, unlock_resp.text)
    unlocked = unlock_resp.json()
    print(f"  identidad desbloqueada: {unlocked['full_name']} <{unlocked['email']}> unlocked_at={unlocked['unlocked_at']}")
    check("unlocked_at presente (D-02)", bool(unlocked.get("unlocked_at")))

    full_after = client.get(f"/api/v1/match-results/{top['match_result_id']}/full", headers=auth(company_token))
    check("full después de unlock -> 200", full_after.status_code == 200)

    print("\n=== B10 · compare (3) ===")
    ids = ",".join(c["match_result_id"] for c in cards)
    compare_resp = client.get(f"/api/v1/vacancies/{vacancy_id}/compare", params={"ids": ids}, headers=auth(company_token))
    check("compare 200", compare_resp.status_code == 200)
    compare_payload = compare_resp.json()
    check("compare trae 3 candidatos", len(compare_payload["candidates"]) == 3)
    for line in compare_payload["key_differences"]:
        print(f"  - {line}")

    print("\n=== B10 · shortlist ===")
    shortlist_put = client.put(
        f"/api/v1/match-results/{top['match_result_id']}/shortlist", json={"stage": "FINALIST"}, headers=auth(company_token)
    )
    check("marcar finalista 200", shortlist_put.status_code == 200, shortlist_put.text)
    shortlist_get = client.get(f"/api/v1/vacancies/{vacancy_id}/shortlist", headers=auth(company_token))
    check("shortlist trae 1 finalista", len(shortlist_get.json()) == 1)

    vacancy_get = client.get(f"/api/v1/vacancies/{vacancy_id}", headers=auth(company_token))
    check("vacante refleja last_match_run_id/shortlist_count", vacancy_get.json()["last_match_run_id"] == match_run_id and vacancy_get.json()["shortlist_count"] == 1)

    print("\n=== D-07 · marketplace del candidato ===")
    open_list = client.get("/api/v1/vacancies/open", headers=auth(token_a)).json()
    check("vacante aparece en /vacancies/open", any(o["vacancy_id"] == vacancy_id for o in open_list))
    apply_resp = client.post(f"/api/v1/vacancies/{vacancy_id}/apply", headers=auth(token_a))
    check("postulación 200", apply_resp.status_code == 200, apply_resp.text)
    apps_resp = client.get("/api/v1/candidates/me/applications", headers=auth(token_a)).json()
    check("aparece en mis postulaciones", any(a["vacancy_id"] == vacancy_id for a in apps_resp))

    print("\n=== Aislamiento entre empresas ===")
    other_resp = client.post("/api/v1/auth/register", json={"email": f"otra-{stamp}@demo.mx", "password": "demo1234", "role": "COMPANY"})
    other_token = other_resp.json()["access_token"]
    isolation_resp = client.get(f"/api/v1/vacancies/{vacancy_id}", headers=auth(other_token))
    check("vacante ajena -> 404", isolation_resp.status_code == 404)

    print(f"\n=== RESULTADO: {passed} OK, {len(failed)} fallas ===")
    for f in failed:
        print(f"  FALLA: {f}")
    return 0 if not failed else 1


if __name__ == "__main__":
    raise SystemExit(main())
