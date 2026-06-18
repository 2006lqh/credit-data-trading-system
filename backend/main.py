from __future__ import annotations

import hashlib
import hmac
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field


ROOT_DIR = Path(__file__).resolve().parents[1]
FRONTEND_DIST = ROOT_DIR / "frontend" / "dist"
FRONTEND_INDEX = FRONTEND_DIST / "index.html"
SECRET_KEY = b"credit-data-trading-system-demo-key"

app = FastAPI(title="Credit Data Trusted Trading System", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

assets: list[dict[str, Any]] = []
trades: list[dict[str, Any]] = []
audits: list[dict[str, Any]] = []


class ApiResponse(BaseModel):
    success: bool = True
    message: str = "ok"
    data: Any = None


class ImportRequest(BaseModel):
    provider_id: str = "provider_db_001"
    user_did: str = "did:demo:credit-user"
    data_type: str = "credit_database_record"
    source_name: str = "credit_database_import"
    quality_score: float = 0.9
    reputation_score: float = 0.9
    records: list[dict[str, Any]] = Field(default_factory=list)


class TradeRequest(BaseModel):
    data_ids: list[str] = Field(default_factory=list)
    buyer_did: str = "did:demo:buyer"
    purpose: str = "credit_risk_rating"


class AuthRequest(BaseModel):
    trade_id: str = "trade_demo"
    user_did: str = "did:demo:credit-user"


class ComputeRequest(BaseModel):
    records: list[dict[str, Any]] = Field(default_factory=list)


class AuditRequest(BaseModel):
    expected_results: list[dict[str, Any]] = Field(default_factory=list)
    submitted_results: list[dict[str, Any]] = Field(default_factory=list)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def digest(payload: Any) -> str:
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=False).encode("utf-8")
    return "0x" + hashlib.sha256(raw).hexdigest()


def signature(payload: Any) -> str:
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=False).encode("utf-8")
    return "sig_hmac_" + hmac.new(SECRET_KEY, raw, hashlib.sha256).hexdigest()


def normalize_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def normalize_int(value: Any, default: int = 0) -> int:
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return default


def evaluate_record(record: dict[str, Any]) -> dict[str, Any]:
    overdue = normalize_int(record.get("overdue_count_12m"))
    repay = normalize_float(record.get("credit_card_repayment_rate", record.get("repayment_rate")), 0.8)
    loan_count = normalize_int(record.get("loan_count"))
    utilization = normalize_float(record.get("credit_utilization"), 0.45)
    debt_ratio = normalize_float(record.get("debt_to_income_ratio"), 0.35)
    inquiries = normalize_int(record.get("recent_credit_inquiries_3m"))
    income = str(record.get("income_level", "medium")).lower()

    income_bonus = {"high": 8, "medium": 3, "low": -6}.get(income, 0)
    score = (
        96
        - overdue * 12
        - max(0, 1 - repay) * 75
        - loan_count * 1.2
        - utilization * 24
        - debt_ratio * 26
        - inquiries * 4
        + income_bonus
    )
    score = max(0, min(100, round(score, 1)))

    if score >= 70:
        rating = "低风险"
    elif score >= 55:
        rating = "中风险"
    else:
        rating = "高风险"

    customer_id = str(record.get("customer_id") or record.get("user_did") or "UNKNOWN")
    customer_name = str(record.get("customer_name") or customer_id)
    return {"customer_id": customer_id, "customer_name": customer_name, "score": score, "rating": rating}


def record_audit(action: str, detail: dict[str, Any]) -> dict[str, Any]:
    item = {
        "audit_id": f"audit_{len(audits) + 1:04d}",
        "action": action,
        "detail": detail,
        "created_at": now_iso(),
        "hash": digest({"action": action, "detail": detail, "index": len(audits) + 1}),
    }
    audits.append(item)
    return item


@app.get("/health", response_model=ApiResponse)
def health() -> ApiResponse:
    return ApiResponse(data={"service": "credit-data-trading-system", "status": "running"})


@app.post("/data/database/import", response_model=ApiResponse)
def import_database(request: ImportRequest) -> ApiResponse:
    created = []
    for index, record in enumerate(request.records, start=1):
        payload_hash = digest(record)
        asset = {
            "data_id": f"data_{len(assets) + 1:04d}",
            "provider_id": request.provider_id,
            "user_did": request.user_did,
            "data_type": request.data_type,
            "source_name": request.source_name,
            "row_index": index,
            "customer_id": record.get("customer_id"),
            "customer_name": record.get("customer_name"),
            "data_hash": payload_hash,
            "gateway_signature": signature(record),
            "quality_score": request.quality_score,
            "reputation_score": request.reputation_score,
            "status": "Registered",
            "created_at": now_iso(),
            "encrypted_payload": "enc_" + payload_hash[2:18],
        }
        assets.append(asset)
        created.append(asset)
    record_audit("DATABASE_IMPORT", {"count": len(created), "source_name": request.source_name})
    return ApiResponse(message="Database records encrypted and stored", data={"imported_count": len(created), "assets": created})


@app.post("/data/upload", response_model=ApiResponse)
def upload_single(request: ImportRequest) -> ApiResponse:
    return import_database(request)


@app.get("/data/assets", response_model=ApiResponse)
def list_assets() -> ApiResponse:
    return ApiResponse(data={"assets": assets, "count": len(assets)})


@app.post("/trade/create", response_model=ApiResponse)
def create_trade(request: TradeRequest) -> ApiResponse:
    trade = {
        "trade_id": f"trade_{len(trades) + 1:04d}",
        "data_ids": request.data_ids,
        "buyer_did": request.buyer_did,
        "purpose": request.purpose,
        "status": "Created",
        "created_at": now_iso(),
        "tx_hash": digest({"data_ids": request.data_ids, "buyer_did": request.buyer_did, "time": len(trades) + 1}),
    }
    trades.append(trade)
    record_audit("TRADE_CREATE", {"trade_id": trade["trade_id"], "count": len(request.data_ids)})
    return ApiResponse(message="Trade created", data=trade)


@app.post("/auth/sign", response_model=ApiResponse)
def sign_auth(request: AuthRequest) -> ApiResponse:
    payload = request.model_dump()
    result = {
        "trade_id": request.trade_id,
        "user_did": request.user_did,
        "authorization_signature": signature(payload),
        "status": "Authorized",
        "created_at": now_iso(),
    }
    record_audit("AUTH_SIGN", {"trade_id": request.trade_id, "user_did": request.user_did})
    return ApiResponse(message="Authorization signed", data=result)


@app.post("/compute/run", response_model=ApiResponse)
def run_compute(request: ComputeRequest) -> ApiResponse:
    results = [evaluate_record(record) for record in request.records]
    distribution: dict[str, int] = {}
    for item in results:
        distribution[item["rating"]] = distribution.get(item["rating"], 0) + 1
    record_audit("RISK_COMPUTE", {"count": len(results), "distribution": distribution})
    return ApiResponse(message="Risk rating completed", data={"results": results, "distribution": distribution})


@app.post("/audit/check", response_model=ApiResponse)
def audit_check(request: AuditRequest) -> ApiResponse:
    expected = {item.get("customer_id"): item.get("rating") for item in request.expected_results}
    submitted = {item.get("customer_id"): item.get("rating") for item in request.submitted_results}
    tampered = [
        {"customer_id": customer_id, "expected": rating, "submitted": submitted.get(customer_id)}
        for customer_id, rating in expected.items()
        if submitted.get(customer_id) != rating
    ]
    blocked = len(tampered) > 0
    event = record_audit("AUDIT_CHECK", {"blocked": blocked, "tampered": tampered})
    return ApiResponse(data={"blocked": blocked, "tampered_count": len(tampered), "tampered": tampered, "event": event})


@app.get("/audit/events", response_model=ApiResponse)
def audit_events() -> ApiResponse:
    return ApiResponse(data={"events": audits, "count": len(audits)})


if FRONTEND_INDEX.exists():
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="frontend-assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str) -> FileResponse:
        target = FRONTEND_DIST / full_path
        if full_path and target.exists() and target.is_file():
            return FileResponse(target)
        return FileResponse(FRONTEND_INDEX)
else:

    @app.get("/")
    def backend_only() -> ApiResponse:
        return health()
