"""
WeatherPulse Dashboard — Reusable UI Components
KPI cards, status indicators, empty states, and layout helpers.
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
    """Render a styled KPI card using custom HTML."""
    accent = accent_color or COLORS["accent_cyan"]
    delta_class = delta_direction
    delta_html = ""
    if delta is not None:
        arrow = "▲" if delta_direction == "positive" else "▼" if delta_direction == "negative" else ""
        delta_html = f'<div class="kpi-delta {delta_class}">{arrow} {delta}</div>'

    val_display = f"{value}" if value is not None else "—"
    if unit:
        val_display += f'<span style="font-size:0.9rem;color:{COLORS["text_secondary"]};font-weight:400;"> {unit}</span>'

    html = f"""
    <div class="kpi-card" style="border-top: 3px solid {accent}; border-top-left-radius: 14px; border-top-right-radius: 14px;">
        <div class="kpi-label">{icon} {label}</div>
        <div class="kpi-value">{val_display}</div>
        {delta_html}
    </div>
    """
    st.markdown(html, unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════════════
#  Status Indicators
# ═══════════════════════════════════════════════════════════════

def status_pill(label: str, status: str = "online"):
    """Render a coloured status pill.  status: online | offline | degraded"""
    st.markdown(
        f'<span class="status-pill {status}">'
        f'<span class="status-dot {status}"></span>{label}'
        f'</span>',
        unsafe_allow_html=True,
    )


def connection_banner(online: bool, status: str = "", checked_at: Optional[datetime] = None):
    """Top-of-page backend connection indicator."""
    if online:
        msg = f"✅ Backend connected — {status}"
    else:
        msg = "⚠️ Backend unreachable — data may be stale"
    ts = checked_at.strftime("%H:%M:%S") if checked_at else "—"
    st.markdown(
        f'<div style="display:flex;align-items:center;justify-content:space-between;'
        f'background:{COLORS["bg_card"]};border:1px solid {COLORS["border"]};'
        f'border-radius:10px;padding:10px 18px;margin-bottom:1rem;font-size:0.82rem;">'
        f'<span style="color:{COLORS["accent_green"] if online else COLORS["accent_amber"]};">{msg}</span>'
        f'<span style="color:{COLORS["text_muted"]};">Checked {ts}</span>'
        f'</div>',
        unsafe_allow_html=True,
    )


def data_freshness_indicator(observation_time: Optional[datetime], retrieval_time: Optional[datetime] = None):
    """Show when data was last observed vs. when it was fetched."""
    obs = observation_time.strftime("%d %b %Y, %H:%M") if observation_time else "Unknown"
    ret = retrieval_time.strftime("%H:%M:%S") if retrieval_time else "—"
    st.markdown(
        f'<div style="background:{COLORS["bg_card"]};border:1px solid {COLORS["border"]};'
        f'border-radius:8px;padding:10px 16px;font-size:0.8rem;display:flex;gap:24px;">'
        f'<span style="color:{COLORS["text_secondary"]};">🕐 Observation: <strong style="color:{COLORS["text_primary"]};">{obs}</strong></span>'
        f'<span style="color:{COLORS["text_secondary"]};">📡 Retrieved: <strong style="color:{COLORS["text_primary"]};">{ret}</strong></span>'
        f'</div>',
        unsafe_allow_html=True,
    )


# ═══════════════════════════════════════════════════════════════
#  Alert Badge
# ═══════════════════════════════════════════════════════════════

def severity_badge(level: str) -> str:
    """Return HTML for a severity badge.  level: none | low | moderate | high | extreme"""
    return f'<span class="severity-badge severity-{level}">{level.upper()}</span>'


def alert_card(title: str, description: str, severity: str, alert_type: str = "",
               value: Optional[float] = None, unit: str = "", threshold: Optional[float] = None):
    """Styled alert card with severity colour accent."""
    sev_colors = {
        "info": COLORS["severity_info"],
        "warning": COLORS["severity_watch"],
        "severe": COLORS["severity_high"],
        "extreme": COLORS["severity_extreme"],
    }
    accent = sev_colors.get(severity.lower(), COLORS["border"])
    badge = severity_badge(severity.lower())
    value_html = ""
    if value is not None:
        value_html = f'<span style="color:{COLORS["text_primary"]};font-weight:600;"> {value}{unit}</span>'
        if threshold is not None:
            value_html += f' <span style="color:{COLORS["text_muted"]};font-size:0.78rem;">(threshold: {threshold}{unit})</span>'

    st.markdown(
        f'<div style="background:{COLORS["bg_card"]};border-left:4px solid {accent};'
        f'border-radius:8px;padding:14px 18px;margin-bottom:0.75rem;">'
        f'<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">'
        f'{badge} <strong style="color:{COLORS["text_primary"]};font-size:0.92rem;">{title}</strong>'
        f'</div>'
        f'<p style="color:{COLORS["text_secondary"]};font-size:0.84rem;margin:4px 0;">{description}</p>'
        f'{value_html}'
        f'</div>',
        unsafe_allow_html=True,
    )


# ═══════════════════════════════════════════════════════════════
#  Empty / Error States
# ═══════════════════════════════════════════════════════════════

def empty_state(title: str = "No Data Available", message: str = "", icon: str = "📭"):
    st.markdown(
        f'<div class="empty-state">'
        f'<div style="font-size:2.5rem;margin-bottom:0.5rem;">{icon}</div>'
        f'<h3>{title}</h3>'
        f'<p>{message}</p>'
        f'</div>',
        unsafe_allow_html=True,
    )


def error_state(message: str = "Something went wrong", details: str = ""):
    st.markdown(
        f'<div class="empty-state" style="border-color:{COLORS["accent_red"]};">'
        f'<div style="font-size:2.5rem;margin-bottom:0.5rem;">⚠️</div>'
        f'<h3 style="color:{COLORS["accent_red"]} !important;">{message}</h3>'
        f'<p>{details}</p>'
        f'</div>',
        unsafe_allow_html=True,
    )


def backend_offline_state():
    error_state(
        "Backend Unreachable",
        f"Cannot connect to the FastAPI backend at <code>{__import__('os').getenv('STREAMLIT_BACKEND_URL', 'http://localhost:8000')}</code>.<br>"
        "Make sure the backend is running and <code>STREAMLIT_BACKEND_URL</code> is set correctly.",
    )


# ═══════════════════════════════════════════════════════════════
#  Section Divider
# ═══════════════════════════════════════════════════════════════

def section_divider():
    st.markdown('<div class="section-divider"></div>', unsafe_allow_html=True)


def section_header(title: str, subtitle: str = "", icon: str = ""):
    st.markdown(
        f'<div style="margin-top:1.5rem;margin-bottom:0.5rem;">'
        f'<h2 style="margin:0;font-size:1.3rem;">{icon} {title}</h2>'
        f'{"<p style=color:" + COLORS["text_muted"] + ";font-size:0.84rem;margin:4px 0 0;>" + subtitle + "</p>" if subtitle else ""}'
        f'</div>',
        unsafe_allow_html=True,
    )


# ═══════════════════════════════════════════════════════════════
#  Footer
# ═══════════════════════════════════════════════════════════════

def footer():
    st.markdown(
        '<div class="footer-brand">'
        'WeatherPulse India Weather Intelligence · Cloud Computing & Big Data Analytics<br>'
        '<span style="font-size:0.7rem;">Dashboard-calculated indicators are screening tools, not official forecasts.</span>'
        '</div>',
        unsafe_allow_html=True,
    )
