"""
WeatherPulse Dashboard — Design System & CSS
Premium dark-mode weather intelligence aesthetic.
"""

# ── Colour Palette ──────────────────────────────────────────────
COLORS = {
    "bg_primary": "#05070B",
    "bg_secondary": "#0A0F18",
    "bg_card": "#101722",
    "bg_card_hover": "#162033",
    "border": "#243248",
    "border_accent": "#38BDF8",
    "text_primary": "#F8FAFC",
    "text_secondary": "#A7B4C7",
    "text_muted": "#718096",
    "accent_cyan": "#22D3EE",
    "accent_blue": "#38BDF8",
    "accent_indigo": "#6366F1",
    "accent_amber": "#F59E0B",
    "accent_coral": "#F97316",
    "accent_red": "#EF4444",
    "accent_green": "#10B981",
    "accent_teal": "#14B8A6",
    "accent_purple": "#8B5CF6",
    "gradient_start": "#06B6D4",
    "gradient_end": "#3B82F6",
    "severity_info": "#3B82F6",
    "severity_watch": "#F59E0B",
    "severity_high": "#EF4444",
    "severity_extreme": "#DC2626",
    "severity_none": "#10B981",
}

# Temperature colour scale (Plotly-compatible)
TEMP_COLORSCALE = [
    [0.0, "#2563EB"],   # Cold – blue
    [0.25, "#06B6D4"],  # Cool – cyan
    [0.45, "#10B981"],  # Mild – green
    [0.65, "#F59E0B"],  # Warm – amber
    [0.85, "#F97316"],  # Hot – coral
    [1.0, "#EF4444"],   # Extreme – red
]

RAIN_COLORSCALE = [
    [0.0, "#1E3A5F"],
    [0.25, "#2563EB"],
    [0.5, "#3B82F6"],
    [0.75, "#06B6D4"],
    [1.0, "#67E8F9"],
]

HUMIDITY_COLORSCALE = [
    [0.0, "#F59E0B"],
    [0.5, "#10B981"],
    [1.0, "#3B82F6"],
]

WIND_COLORSCALE = [
    [0.0, "#10B981"],
    [0.5, "#F59E0B"],
    [1.0, "#EF4444"],
]


# ── Plotly Layout Defaults ──────────────────────────────────────
PLOTLY_LAYOUT = dict(
    paper_bgcolor="rgba(0,0,0,0)",
    plot_bgcolor="rgba(0,0,0,0)",
    font=dict(family="Inter, Segoe UI, sans-serif", color=COLORS["text_primary"], size=12),
    margin=dict(l=40, r=20, t=40, b=40),
    xaxis=dict(
        gridcolor="rgba(51,65,85,0.4)",
        zerolinecolor="rgba(51,65,85,0.4)",
        tickfont=dict(color=COLORS["text_secondary"]),
    ),
    yaxis=dict(
        gridcolor="rgba(51,65,85,0.4)",
        zerolinecolor="rgba(51,65,85,0.4)",
        tickfont=dict(color=COLORS["text_secondary"]),
    ),
    legend=dict(
        bgcolor="rgba(0,0,0,0)",
        font=dict(color=COLORS["text_secondary"], size=11),
    ),
    hoverlabel=dict(
        bgcolor=COLORS["bg_card"],
        font_size=12,
        font_family="Inter, Segoe UI, sans-serif",
        bordercolor=COLORS["border"],
    ),
)


def get_plotly_layout(**overrides):
    """Return a copy of the default Plotly layout, merged with *overrides*."""
    import copy
    layout = copy.deepcopy(PLOTLY_LAYOUT)
    layout.update(overrides)
    return layout


# ── Global CSS ──────────────────────────────────────────────────
GLOBAL_CSS = f"""
<style>
/* ── Import fonts ─────────────────────── */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

/* ── Root variables ───────────────────── */
:root {{
    --bg-primary: {COLORS['bg_primary']};
    --bg-secondary: {COLORS['bg_secondary']};
    --bg-card: {COLORS['bg_card']};
    --border: {COLORS['border']};
    --text-primary: {COLORS['text_primary']};
    --text-secondary: {COLORS['text_secondary']};
    --accent-cyan: {COLORS['accent_cyan']};
    --accent-blue: {COLORS['accent_blue']};
    --accent-amber: {COLORS['accent_amber']};
    --accent-coral: {COLORS['accent_coral']};
    --accent-red: {COLORS['accent_red']};
    --accent-green: {COLORS['accent_green']};
}}

/* ── Base ─────────────────────────────── */
html, body, [data-testid="stAppViewContainer"],
[data-testid="stApp"] {{
    background:
        radial-gradient(circle at 78% -15%, rgba(14,116,144,0.16), transparent 29rem),
        radial-gradient(circle at -10% 35%, rgba(30,64,175,0.10), transparent 27rem),
        var(--bg-primary) !important;
    color: var(--text-primary) !important;
    font-family: 'Inter', 'Segoe UI', sans-serif !important;
}}

/* ── Sidebar ──────────────────────────── */
[data-testid="stSidebar"] {{
    background: linear-gradient(180deg, #0B111B 0%, #06090F 100%) !important;
    border-right: 1px solid {COLORS['border']} !important;
}}
[data-testid="stSidebar"] .stMarkdown h1,
[data-testid="stSidebar"] .stMarkdown h2,
[data-testid="stSidebar"] .stMarkdown h3 {{
    color: {COLORS['text_primary']} !important;
}}
[data-testid="stSidebar"] .stMarkdown p,
[data-testid="stSidebar"] .stMarkdown li {{
    color: {COLORS['text_secondary']} !important;
    font-size: 0.88rem;
}}
[data-testid="stSidebar"] .stSelectbox label,
[data-testid="stSidebar"] .stMultiSelect label,
[data-testid="stSidebar"] .stSlider label,
[data-testid="stSidebar"] .stRadio label {{
    color: {COLORS['text_secondary']} !important;
    font-weight: 500;
    font-size: 0.82rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
}}

/* ── Header typography ────────────────── */
.stMarkdown h1 {{
    background: linear-gradient(135deg, {COLORS['accent_cyan']}, {COLORS['accent_blue']});
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    font-weight: 800 !important;
    letter-spacing: -0.02em;
}}
.stMarkdown h2 {{
    color: {COLORS['text_primary']} !important;
    font-weight: 700 !important;
    border-bottom: 2px solid {COLORS['border']};
    padding-bottom: 0.5rem;
    margin-top: 2rem;
}}
.stMarkdown h3 {{
    color: {COLORS['accent_cyan']} !important;
    font-weight: 600 !important;
}}

/* ── Tabs ─────────────────────────────── */
.stTabs [data-baseweb="tab-list"] {{
    gap: 2px;
    background: {COLORS['bg_secondary']};
    border-radius: 12px;
    padding: 4px;
    border: 1px solid {COLORS['border']};
}}
.stTabs [data-baseweb="tab"] {{
    border-radius: 10px;
    color: {COLORS['text_secondary']};
    font-weight: 500;
    padding: 10px 20px;
    font-size: 0.88rem;
}}
.stTabs [aria-selected="true"] {{
    background: linear-gradient(135deg, rgba(6,182,212,0.15), rgba(59,130,246,0.15)) !important;
    color: {COLORS['accent_cyan']} !important;
    border-bottom: none !important;
    font-weight: 600;
}}

/* ── Metric cards ─────────────────────── */
[data-testid="stMetric"] {{
    background: linear-gradient(145deg, rgba(22,32,51,0.96), rgba(12,18,29,0.96));
    border: 1px solid {COLORS['border']};
    border-radius: 12px;
    padding: 16px 20px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
}}
[data-testid="stMetric"]:hover {{
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    border-color: {COLORS['border_accent']};
}}
[data-testid="stMetricLabel"] {{
    color: {COLORS['text_secondary']} !important;
    font-size: 0.78rem !important;
    font-weight: 600 !important;
    text-transform: uppercase;
    letter-spacing: 0.06em;
}}
[data-testid="stMetricValue"] {{
    color: {COLORS['text_primary']} !important;
    font-weight: 700 !important;
    font-size: 1.6rem !important;
}}
[data-testid="stMetricDelta"] {{
    font-size: 0.8rem !important;
}}

/* ── Buttons ──────────────────────────── */
.stButton > button {{
    background: linear-gradient(135deg, {COLORS['accent_cyan']}, {COLORS['accent_blue']}) !important;
    color: white !important;
    border: none !important;
    border-radius: 8px !important;
    font-weight: 600 !important;
    padding: 0.5rem 1.2rem !important;
    transition: all 0.2s ease !important;
    box-shadow: 0 2px 8px rgba(6,182,212,0.25) !important;
}}
.stButton > button:hover {{
    box-shadow: 0 4px 16px rgba(6,182,212,0.4) !important;
    transform: translateY(-1px);
}}

/* ── Select boxes, inputs ─────────────── */
.stSelectbox [data-baseweb="select"],
.stMultiSelect [data-baseweb="select"] {{
    background: {COLORS['bg_card']} !important;
    border-color: {COLORS['border']} !important;
    border-radius: 8px !important;
}}
.stSelectbox [data-baseweb="select"] > div,
.stMultiSelect [data-baseweb="select"] > div {{
    color: {COLORS['text_primary']} !important;
}}

/* ── Expander ─────────────────────────── */
.streamlit-expanderHeader {{
    background: {COLORS['bg_card']} !important;
    border: 1px solid {COLORS['border']} !important;
    border-radius: 8px !important;
    color: {COLORS['text_primary']} !important;
    font-weight: 500;
}}

/* ── Data editor / tables ─────────────── */
[data-testid="stDataFrame"] {{
    border: 1px solid {COLORS['border']} !important;
    border-radius: 8px;
    overflow: hidden;
}}

/* ── Divider ──────────────────────────── */
hr {{
    border-color: {COLORS['border']} !important;
    opacity: 0.4;
}}

/* ── Scrollbar ────────────────────────── */
::-webkit-scrollbar {{
    width: 6px;
    height: 6px;
}}
::-webkit-scrollbar-track {{
    background: {COLORS['bg_primary']};
}}
::-webkit-scrollbar-thumb {{
    background: {COLORS['border']};
    border-radius: 3px;
}}
::-webkit-scrollbar-thumb:hover {{
    background: {COLORS['text_muted']};
}}

/* ── Alert/status badges ──────────────── */
.severity-badge {{
    display: inline-block;
    padding: 3px 10px;
    border-radius: 6px;
    font-weight: 600;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}}
.severity-none {{ background: rgba(16,185,129,0.15); color: #10B981; }}
.severity-low  {{ background: rgba(59,130,246,0.15); color: #3B82F6; }}
.severity-moderate {{ background: rgba(245,158,11,0.15); color: #F59E0B; }}
.severity-high {{ background: rgba(239,68,68,0.15); color: #EF4444; }}
.severity-extreme {{ background: rgba(220,38,38,0.20); color: #FCA5A5; }}

/* ── KPI Card Custom Component ────────── */
.kpi-card {{
    background: {COLORS['bg_card']};
    border: 1px solid {COLORS['border']};
    border-radius: 14px;
    padding: 20px 24px;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.035), 0 12px 26px rgba(0,0,0,0.22);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    position: relative;
    overflow: hidden;
}}
.kpi-card::before {{
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: linear-gradient(90deg, {COLORS['accent_cyan']}, {COLORS['accent_blue']});
}}
.kpi-card:hover {{
    transform: translateY(-3px);
    box-shadow: 0 8px 28px rgba(0,0,0,0.28);
}}
.kpi-label {{
    color: {COLORS['text_secondary']};
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 6px;
}}
.kpi-value {{
    color: {COLORS['text_primary']};
    font-size: 1.8rem;
    font-weight: 700;
    line-height: 1.2;
}}
.kpi-delta {{
    font-size: 0.78rem;
    font-weight: 500;
    margin-top: 4px;
}}
.kpi-delta.positive {{ color: {COLORS['accent_green']}; }}
.kpi-delta.negative {{ color: {COLORS['accent_red']}; }}
.kpi-delta.neutral  {{ color: {COLORS['text_muted']}; }}

/* ── Status Pill ──────────────────────── */
.status-pill {{
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
}}
.status-pill.online  {{ background: rgba(16,185,129,0.12); color: #10B981; }}
.status-pill.offline {{ background: rgba(239,68,68,0.12); color: #EF4444; }}
.status-pill.degraded {{ background: rgba(245,158,11,0.12); color: #F59E0B; }}

.status-dot {{
    width: 7px;
    height: 7px;
    border-radius: 50%;
    display: inline-block;
}}
.status-dot.online  {{ background: #10B981; box-shadow: 0 0 6px #10B981; }}
.status-dot.offline {{ background: #EF4444; box-shadow: 0 0 6px #EF4444; }}
.status-dot.degraded {{ background: #F59E0B; box-shadow: 0 0 6px #F59E0B; }}

/* ── Section Divider ──────────────────── */
.section-divider {{
    height: 1px;
    background: linear-gradient(90deg, transparent, {COLORS['border']}, transparent);
    margin: 2rem 0;
}}

/* ── No-data empty state ──────────────── */
.empty-state {{
    text-align: center;
    padding: 3rem 2rem;
    color: {COLORS['text_muted']};
    background: {COLORS['bg_card']};
    border: 1px dashed {COLORS['border']};
    border-radius: 12px;
}}
.empty-state h3 {{
    color: {COLORS['text_secondary']} !important;
    margin-bottom: 0.5rem;
}}
.empty-state p {{
    font-size: 0.88rem;
}}

/* ── Footer branding ──────────────────── */
.footer-brand {{
    text-align: center;
    padding: 1.5rem 0;
    color: {COLORS['text_muted']};
    font-size: 0.75rem;
    border-top: 1px solid {COLORS['border']};
    margin-top: 3rem;
}}

.command-header {{
    position: relative; overflow: hidden; margin: 0 0 1.6rem; padding: 1.6rem 1.8rem;
    border: 1px solid rgba(56,189,248,0.26); border-radius: 18px;
    background: linear-gradient(110deg, rgba(13,23,38,0.96), rgba(9,14,23,0.88));
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 18px 36px rgba(0,0,0,0.25);
}}
.command-header::after {{ content:''; position:absolute; width:18rem; height:18rem; right:-7rem; top:-12rem; border-radius:50%; background:radial-gradient(circle, rgba(34,211,238,0.22), transparent 66%); }}
.command-eyebrow {{ color:{COLORS['accent_cyan']}; font-size:.72rem; font-weight:700; letter-spacing:.14em; text-transform:uppercase; }}
.command-title {{ color:{COLORS['text_primary']}; font-size:2rem; line-height:1.1; font-weight:760; letter-spacing:-.035em; margin:.35rem 0 .45rem; }}
.command-copy {{ color:{COLORS['text_secondary']}; font-size:.93rem; max-width:46rem; margin:0; }}
.command-rail {{ display:flex; align-items:center; gap:.55rem; margin-top:1rem; color:{COLORS['text_muted']}; font-size:.76rem; font-family:'JetBrains Mono', monospace; }}
.command-dot {{ width:.5rem; height:.5rem; border-radius:50%; background:{COLORS['accent_green']}; box-shadow:0 0 12px {COLORS['accent_green']}; }}
</style>
"""
