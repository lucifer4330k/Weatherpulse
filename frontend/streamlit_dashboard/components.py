"""
WeatherPulse Dashboard — Reusable UI Components
Black-first precision components: KPI cards, status indicators, empty states, and layout helpers.
"""

from datetime import datetime
from typing import Any, Optional

import streamlit as st

from styles import COLORS


# ═══════════════════════════════════════════════════════════════
#  KPI / Metric Card
# ═══════════════════════════════════════════════════════════════

def kpi_card(
    label: str,
    value: Any,
    unit: str = "",
    delta: Optional[str] = None,
    delta_direction: str = "neutral",  # positive | negative | neutral
    accent_color: Optional[str] = None,
    icon: str = "",
):
    """Render an editorial KPI card using clean black-first HTML."""
    accent = accent_color or COLORS["accent_amber"]
    delta_class = delta_direction
    delta_html = ""
    if delta is not None:
        arrow = "▲" if delta_direction == "positive" else "▼" if delta_direction == "negative" else "•"
        delta_html = f'<div class="kpi-delta {delta_class}" style="margin-top:5px;font-size:0.72rem;font-family:\'JetBrains Mono\', monospace;">{arrow} {delta}</div>'

    val_display = f"{value}" if value is not None else "—"
    if unit:
        val_display += f'<span style="font-size:0.85rem;color:{COLORS["text_secondary"]};font-weight:400;margin-left:2px;">{unit}</span>'

    icon_html = f'<span style="margin-right:4px;">{icon}</span>' if icon else ""

    html = f"""
    <div class="kpi-card" style="border-top: 2px solid {accent};">
        <div class="kpi-label">{icon_html}{label}</div>
        <div class="kpi-value">{val_display}</div>
        {delta_html}
    </div>
    """
    st.markdown(html, unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════════════
#  Status Indicators
# ═══════════════════════════════════════════════════════════════

def status_pill(label: str, status: str = "online"):
    """Render a clean status pill. status: online | offline | degraded"""
    st.markdown(
        f'<span class="status-pill {status}">'
        f'<span class="status-dot {status}"></span>{label}'
        f'</span>',
        unsafe_allow_html=True,
    )


def connection_banner(online: bool, status: str = "", checked_at: Optional[datetime] = None):
    """Top-of-page backend connection indicator."""
    dot_color = COLORS["accent_green"] if online else COLORS["accent_amber"]
    msg = f"API Service Connected · {status}" if online else "API Service Unreachable · Using Stale/Cached Observations"
    ts = checked_at.strftime("%H:%M:%S") if checked_at else "—"
    st.markdown(
        f'<div style="display:flex;align-items:center;justify-content:space-between;'
        f'background:{COLORS["bg_secondary"]};border:1px solid {COLORS["border"]};'
        f'border-radius:4px;padding:8px 14px;margin-bottom:1rem;font-size:0.78rem;'
        f'font-family:\'JetBrains Mono\', monospace;">'
        f'<div style="display:flex;align-items:center;gap:8px;">'
        f'<span class="status-dot" style="background:{dot_color};"></span>'
        f'<span style="color:{COLORS["text_primary"]};font-weight:500;">{msg}</span>'
        f'</div>'
        f'<span style="color:{COLORS["text_muted"]};">Checked {ts}</span>'
        f'</div>',
        unsafe_allow_html=True,
    )


def data_freshness_indicator(observation_time: Optional[datetime], retrieval_time: Optional[datetime] = None):
    """Show when data was last observed vs. when it was fetched."""
    obs = observation_time.strftime("%d %b %Y, %H:%M UTC") if observation_time else "Unknown"
    ret = retrieval_time.strftime("%H:%M:%S") if retrieval_time else "—"
    st.markdown(
        f'<div style="background:{COLORS["bg_secondary"]};border:1px solid {COLORS["border"]};'
        f'border-radius:4px;padding:8px 14px;font-size:0.75rem;font-family:\'JetBrains Mono\', monospace;'
        f'display:flex;flex-wrap:wrap;gap:20px;align-items:center;">'
        f'<span style="color:{COLORS["text_muted"]};">OBSERVATION: <strong style="color:{COLORS["text_primary"]};font-weight:600;">{obs}</strong></span>'
        f'<span style="color:{COLORS["text_muted"]};">INGESTION: <strong style="color:{COLORS["accent_amber"]};font-weight:600;">{ret}</strong></span>'
        f'<span style="color:{COLORS["text_muted"]};margin-left:auto;">PROVENANCE: <span style="color:{COLORS["text_secondary"]};">OPEN-METEO / SPARK STREAMING</span></span>'
        f'</div>',
        unsafe_allow_html=True,
    )


# ═══════════════════════════════════════════════════════════════
#  Alert Badge
# ═══════════════════════════════════════════════════════════════

def severity_badge(level: str) -> str:
    """Return HTML for a severity badge. level: none | low | moderate | high | extreme"""
    return f'<span class="severity-badge severity-{level.lower()}">{level.upper()}</span>'


def alert_card(title: str, description: str, severity: str, alert_type: str = "",
               value: Optional[float] = None, unit: str = "", threshold: Optional[float] = None):
    """Styled alert card with severity colour accent."""
    sev_colors = {
        "info": COLORS["severity_info"],
        "low": COLORS["severity_info"],
        "warning": COLORS["severity_watch"],
        "moderate": COLORS["severity_watch"],
        "severe": COLORS["severity_high"],
        "high": COLORS["severity_high"],
        "extreme": COLORS["severity_extreme"],
    }
    accent = sev_colors.get(severity.lower(), COLORS["border"])
    badge = severity_badge(severity.lower())
    value_html = ""
    if value is not None:
        value_html = f'<span style="color:{COLORS["text_primary"]};font-weight:600;font-family:\'JetBrains Mono\', monospace;"> {value}{unit}</span>'
        if threshold is not None:
            value_html += f' <span style="color:{COLORS["text_muted"]};font-size:0.75rem;font-family:\'JetBrains Mono\', monospace;">(threshold: {threshold}{unit})</span>'

    st.markdown(
        f'<div style="background:{COLORS["bg_card"]};border:1px solid {COLORS["border"]};border-left:3px solid {accent};'
        f'border-radius:4px;padding:12px 16px;margin-bottom:0.6rem;">'
        f'<div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">'
        f'{badge} <strong style="color:{COLORS["text_primary"]};font-size:0.88rem;">{title}</strong>'
        f'</div>'
        f'<p style="color:{COLORS["text_secondary"]};font-size:0.82rem;margin:4px 0 6px;">{description}</p>'
        f'{value_html}'
        f'</div>',
        unsafe_allow_html=True,
    )


# ═══════════════════════════════════════════════════════════════
#  Empty / Error States
# ═══════════════════════════════════════════════════════════════

def empty_state(title: str = "No Data Available", message: str = "", icon: str = ""):
    icon_html = f'<div style="font-size:1.5rem;margin-bottom:0.4rem;color:{COLORS["text_muted"]};">{icon}</div>' if icon else ""
    st.markdown(
        f'<div class="empty-state">'
        f'{icon_html}'
        f'<h3>{title}</h3>'
        f'<p>{message}</p>'
        f'</div>',
        unsafe_allow_html=True,
    )


def error_state(message: str = "Service Unavailable", details: str = ""):
    st.markdown(
        f'<div class="empty-state" style="border-color:rgba(217,83,79,0.3);background:{COLORS["bg_card"]};">'
        f'<div style="font-size:1.5rem;margin-bottom:0.4rem;color:{COLORS["accent_red"]};">!</div>'
        f'<h3 style="color:{COLORS["accent_red"]} !important;">{message}</h3>'
        f'<p>{details}</p>'
        f'</div>',
        unsafe_allow_html=True,
    )


def backend_offline_state():
    error_state(
        "Backend Connection Offline",
        f"Unable to reach the FastAPI weather service at <code>{__import__('os').getenv('STREAMLIT_BACKEND_URL', 'http://localhost:8000')}</code>.<br>"
        "Verify that the backend container or process is active and check network routes.",
    )


# ═══════════════════════════════════════════════════════════════
#  Section Divider & Header
# ═══════════════════════════════════════════════════════════════

def section_divider():
    st.markdown('<div class="section-divider"></div>', unsafe_allow_html=True)


def section_header(title: str, subtitle: str = "", icon: str = ""):
    icon_prefix = f"{icon} " if icon else ""
    st.markdown(
        f'<div style="margin-top:1.25rem;margin-bottom:0.5rem;">'
        f'<div style="color:{COLORS["text_primary"]};font-size:0.95rem;font-weight:600;letter-spacing:-0.01em;">{icon_prefix}{title}</div>'
        f'{"<div style=color:" + COLORS["text_muted"] + ";font-size:0.78rem;margin-top:2px;>" + subtitle + "</div>" if subtitle else ""}'
        f'</div>',
        unsafe_allow_html=True,
    )


# ═══════════════════════════════════════════════════════════════
#  Footer
# ═══════════════════════════════════════════════════════════════

def footer():
    st.markdown(
        f'<div class="footer-brand">'
        f'WEATHERPULSE · INDIA METEOROLOGICAL INTELLIGENCE & ANALYTICS<br>'
        f'<span style="color:{COLORS["text_muted"]};font-size:0.68rem;">Deterministic stream processing pipeline · Cassandra / Kafka / Spark / Open-Meteo</span>'
        f'</div>',
        unsafe_allow_html=True,
    )
