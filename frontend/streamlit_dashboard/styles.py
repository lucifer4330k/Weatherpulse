"""
WeatherPulse Dashboard — Black-First Design System & Styles
Precision meteorological intelligence aesthetic inspired by scientific and financial terminals.
"""

# ── Design Tokens & Colour Palette ──────────────────────────────────────
COLORS = {
    # Core Surfaces
    "bg_primary": "#090909",
    "bg_secondary": "#101010",
    "bg_card": "#171717",
    "bg_card_hover": "#202020",
    "border": "#2A2A2A",
    "border_subtle": "#1F1F1F",
    "border_accent": "#E7B75A",

    # Core Typography
    "text_primary": "#F5F5F5",
    "text_secondary": "#A3A3A3",
    "text_muted": "#737373",

    # Brand & Semantic Accents
    "primary_highlight": "#E7B75A",
    "accent_amber": "#E7B75A",
    "accent_gold": "#D4A347",
    "accent_green": "#3EA874",
    "accent_red": "#D9534F",
    "accent_coral": "#E07A5F",
    "accent_cyan": "#E7B75A",     # Replaced blue/cyan dominance with warm highlight
    "accent_blue": "#7899B8",     # Restrained slate-blue for precipitation/water
    "accent_indigo": "#8A94A6",   # Muted graphite-indigo
    "accent_teal": "#4E9F8E",     # Muted sage-teal
    "accent_purple": "#9A8C98",   # Muted mauve-purple

    # Background Gradients (subtle graphite, zero neon/cyan)
    "gradient_start": "#171717",
    "gradient_end": "#101010",

    # Severities & Status
    "severity_none": "#3EA874",
    "severity_info": "#7899B8",
    "severity_watch": "#E7B75A",
    "severity_high": "#E07A5F",
    "severity_extreme": "#D9534F",
}

# Temperature sequential scale (Scientific, restrained)
TEMP_COLORSCALE = [
    [0.0, "#3B5B82"],   # Cold – steel slate
    [0.25, "#4E878C"],  # Cool – muted sage
    [0.50, "#C2A676"],  # Mild – warm sand
    [0.75, "#E7B75A"],  # Warm – amber
    [1.0, "#C24D47"],   # Extreme – restrained brick red
]

# Rainfall sequential scale (Slate to soft azure, zero neon)
RAIN_COLORSCALE = [
    [0.0, "#151B22"],
    [0.25, "#2C3E50"],
    [0.50, "#4A6572"],
    [0.75, "#6A89A7"],
    [1.0, "#8FAAC8"],
]

# Humidity sequential scale (Sand to sage-slate)
HUMIDITY_COLORSCALE = [
    [0.0, "#C2A676"],
    [0.5, "#4E9F8E"],
    [1.0, "#5C7C99"],
]

# Wind speed sequential scale (Green to warm amber to restrained red)
WIND_COLORSCALE = [
    [0.0, "#3EA874"],
    [0.5, "#E7B75A"],
    [1.0, "#D9534F"],
]


# ── Plotly Layout Defaults ──────────────────────────────────────
PLOTLY_LAYOUT = dict(
    paper_bgcolor="rgba(0,0,0,0)",
    plot_bgcolor="rgba(0,0,0,0)",
    font=dict(family="Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif", color=COLORS["text_secondary"], size=11),
    margin=dict(l=44, r=20, t=36, b=40),
    xaxis=dict(
        gridcolor="rgba(255,255,255,0.04)",
        zerolinecolor="rgba(255,255,255,0.08)",
        tickfont=dict(color=COLORS["text_muted"], size=10, family="JetBrains Mono, monospace"),
        linecolor=COLORS["border"],
    ),
    yaxis=dict(
        gridcolor="rgba(255,255,255,0.04)",
        zerolinecolor="rgba(255,255,255,0.08)",
        tickfont=dict(color=COLORS["text_muted"], size=10, family="JetBrains Mono, monospace"),
        linecolor=COLORS["border"],
    ),
    legend=dict(
        bgcolor="rgba(23,23,23,0.85)",
        bordercolor=COLORS["border"],
        borderwidth=1,
        font=dict(color=COLORS["text_secondary"], size=10),
    ),
    hoverlabel=dict(
        bgcolor=COLORS["bg_card"],
        font_size=11,
        font_family="Inter, sans-serif",
        font_color=COLORS["text_primary"],
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
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

/* ── Root variables ───────────────────── */
:root {{
    --bg-primary: {COLORS['bg_primary']};
    --bg-secondary: {COLORS['bg_secondary']};
    --bg-card: {COLORS['bg_card']};
    --bg-card-hover: {COLORS['bg_card_hover']};
    --border: {COLORS['border']};
    --border-subtle: {COLORS['border_subtle']};
    --text-primary: {COLORS['text_primary']};
    --text-secondary: {COLORS['text_secondary']};
    --text-muted: {COLORS['text_muted']};
    --accent-amber: {COLORS['accent_amber']};
    --accent-green: {COLORS['accent_green']};
    --accent-red: {COLORS['accent_red']};
    --accent-blue: {COLORS['accent_blue']};
}}

/* ── Base application background ─────────────────────────────── */
html, body, [data-testid="stAppViewContainer"],
[data-testid="stApp"], .main .block-container {{
    background-color: var(--bg-primary) !important;
    color: var(--text-primary) !important;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
}}

/* Remove default oversized top padding in Streamlit */
.main .block-container {{
    padding-top: 1.5rem !important;
    padding-bottom: 3rem !important;
    max-width: 1400px;
}}

/* ── Sidebar ──────────────────────────── */
[data-testid="stSidebar"] {{
    background-color: {COLORS['bg_secondary']} !important;
    border-right: 1px solid {COLORS['border']} !important;
}}
[data-testid="stSidebar"] > div:first-child {{
    background-color: {COLORS['bg_secondary']} !important;
}}
[data-testid="stSidebar"] .stMarkdown h1,
[data-testid="stSidebar"] .stMarkdown h2,
[data-testid="stSidebar"] .stMarkdown h3 {{
    color: {COLORS['text_primary']} !important;
    letter-spacing: -0.01em;
}}
[data-testid="stSidebar"] .stMarkdown p,
[data-testid="stSidebar"] .stMarkdown li {{
    color: {COLORS['text_secondary']} !important;
    font-size: 0.82rem;
}}
[data-testid="stSidebar"] .stRadio label,
[data-testid="stSidebar"] .stSelectbox label,
[data-testid="stSidebar"] .stMultiSelect label,
[data-testid="stSidebar"] .stSlider label {{
    color: {COLORS['text_muted']} !important;
    font-weight: 600;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
}}

/* ── Radio Navigation styling ─────────── */
[data-testid="stSidebar"] [data-testid="stRadio"] > div {{
    gap: 4px;
}}
[data-testid="stSidebar"] [data-testid="stRadio"] label > div:first-child {{
    display: none;
}}
[data-testid="stSidebar"] [data-testid="stRadio"] label {{
    padding: 8px 12px !important;
    border-radius: 4px !important;
    border: 1px solid transparent !important;
    cursor: pointer;
    transition: all 0.15s ease-in-out;
    background: transparent;
    color: {COLORS['text_secondary']} !important;
    font-size: 0.85rem !important;
    font-weight: 500 !important;
    text-transform: none !important;
    letter-spacing: normal !important;
}}
[data-testid="stSidebar"] [data-testid="stRadio"] label:hover {{
    background: {COLORS['bg_card']} !important;
    color: {COLORS['text_primary']} !important;
    border-color: {COLORS['border_subtle']} !important;
}}
[data-testid="stSidebar"] [data-testid="stRadio"] label[data-checked="true"],
[data-testid="stSidebar"] [data-testid="stRadio"] label:has(input:checked) {{
    background: {COLORS['bg_card']} !important;
    color: {COLORS['text_primary']} !important;
    border-color: {COLORS['border']} !important;
    border-left: 3px solid {COLORS['accent_amber']} !important;
    font-weight: 600 !important;
}}

/* ── Typography ───────────────────────── */
h1, h2, h3, h4, h5, h6 {{
    color: {COLORS['text_primary']} !important;
    letter-spacing: -0.02em !important;
}}
h1 {{
    font-size: 1.75rem !important;
    font-weight: 700 !important;
    margin-bottom: 0.4rem !important;
}}
h2 {{
    font-size: 1.25rem !important;
    font-weight: 600 !important;
    border-bottom: 1px solid {COLORS['border']};
    padding-bottom: 0.4rem;
    margin-top: 1.5rem;
}}
h3 {{
    font-size: 1.05rem !important;
    font-weight: 600 !important;
    color: {COLORS['text_primary']} !important;
}}

/* ── Tabs ─────────────────────────────── */
.stTabs [data-baseweb="tab-list"] {{
    gap: 0;
    background: {COLORS['bg_secondary']};
    border-radius: 4px;
    padding: 2px;
    border: 1px solid {COLORS['border']};
}}
.stTabs [data-baseweb="tab"] {{
    border-radius: 3px;
    color: {COLORS['text_secondary']};
    font-weight: 500;
    padding: 7px 16px;
    font-size: 0.82rem;
    border: none !important;
    background: transparent !important;
}}
.stTabs [aria-selected="true"] {{
    background: {COLORS['bg_card']} !important;
    color: {COLORS['accent_amber']} !important;
    font-weight: 600 !important;
    border: 1px solid {COLORS['border']} !important;
}}

/* ── Native Metrics ───────────────────── */
[data-testid="stMetric"] {{
    background: {COLORS['bg_card']};
    border: 1px solid {COLORS['border']};
    border-radius: 4px;
    padding: 12px 16px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.4);
}}
[data-testid="stMetricLabel"] {{
    color: {COLORS['text_muted']} !important;
    font-size: 0.72rem !important;
    font-weight: 600 !important;
    text-transform: uppercase;
    letter-spacing: 0.08em;
}}
[data-testid="stMetricValue"] {{
    color: {COLORS['text_primary']} !important;
    font-weight: 600 !important;
    font-size: 1.45rem !important;
    font-family: 'JetBrains Mono', monospace !important;
}}

/* ── Buttons ──────────────────────────── */
.stButton > button {{
    background: {COLORS['bg_card']} !important;
    color: {COLORS['text_primary']} !important;
    border: 1px solid {COLORS['border']} !important;
    border-radius: 4px !important;
    font-weight: 500 !important;
    font-size: 0.82rem !important;
    padding: 0.45rem 1rem !important;
    transition: all 0.15s ease !important;
}}
.stButton > button:hover {{
    background: {COLORS['bg_card_hover']} !important;
    border-color: {COLORS['accent_amber']} !important;
    color: {COLORS['accent_amber']} !important;
}}
.stButton > button:active {{
    background: {COLORS['border']} !important;
}}

/* ── Inputs & Selectors ───────────────── */
.stSelectbox [data-baseweb="select"],
.stMultiSelect [data-baseweb="select"],
.stTextInput > div > div {{
    background: {COLORS['bg_card']} !important;
    border-color: {COLORS['border']} !important;
    border-radius: 4px !important;
    color: {COLORS['text_primary']} !important;
    font-size: 0.85rem;
}}
.stSelectbox [data-baseweb="select"] > div,
.stMultiSelect [data-baseweb="select"] > div {{
    color: {COLORS['text_primary']} !important;
}}
.stSelectbox label, .stMultiSelect label, .stTextInput label {{
    color: {COLORS['text_muted']} !important;
    font-size: 0.72rem !important;
    font-weight: 600 !important;
    text-transform: uppercase;
    letter-spacing: 0.06em;
}}

/* ── Expanders ────────────────────────── */
[data-testid="stExpander"] {{
    background: {COLORS['bg_secondary']} !important;
    border: 1px solid {COLORS['border']} !important;
    border-radius: 4px !important;
}}
[data-testid="stExpander"] details summary {{
    color: {COLORS['text_secondary']} !important;
    font-weight: 500;
    font-size: 0.85rem;
}}
[data-testid="stExpander"] details summary:hover {{
    color: {COLORS['text_primary']} !important;
}}

/* ── Tables & DataFrames ──────────────── */
[data-testid="stDataFrame"] {{
    border: 1px solid {COLORS['border']} !important;
    border-radius: 4px;
    background: {COLORS['bg_secondary']};
}}

/* ── Divider ──────────────────────────── */
hr {{
    border: none;
    height: 1px;
    background: {COLORS['border']} !important;
    margin: 1.25rem 0 !important;
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
    border-radius: 2px;
}}
::-webkit-scrollbar-thumb:hover {{
    background: {COLORS['text_muted']};
}}

/* ── Refined Editorial Header ─────────── */
.editorial-header, .command-header {{
    background: {COLORS['bg_secondary']};
    border: 1px solid {COLORS['border']};
    border-left: 3px solid {COLORS['accent_amber']};
    border-radius: 4px;
    padding: 1rem 1.25rem;
    margin-bottom: 1.25rem;
}}
.editorial-eyebrow, .command-eyebrow {{
    color: {COLORS['accent_amber']};
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin-bottom: 0.25rem;
}}
.editorial-title, .command-title {{
    color: {COLORS['text_primary']};
    font-size: 1.25rem;
    font-weight: 600;
    letter-spacing: -0.02em;
    margin: 0 0 0.25rem 0;
}}
.editorial-copy, .command-copy {{
    color: {COLORS['text_secondary']};
    font-size: 0.82rem;
    margin: 0;
    line-height: 1.4;
}}
.editorial-meta, .command-rail {{
    display: flex;
    align-items: center;
    gap: 0.65rem;
    margin-top: 0.6rem;
    color: {COLORS['text_muted']};
    font-size: 0.72rem;
    font-family: 'JetBrains Mono', monospace;
}}
.editorial-dot, .command-dot {{
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: {COLORS['accent_green']};
    display: inline-block;
}}

/* ── KPI Card Custom Component ────────── */
.kpi-card {{
    background: {COLORS['bg_card']};
    border: 1px solid {COLORS['border']};
    border-top: 2px solid {COLORS['accent_amber']};
    border-radius: 4px;
    padding: 12px 14px;
    position: relative;
}}
.kpi-label {{
    color: {COLORS['text_muted']};
    font-size: 0.68rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 4px;
}}
.kpi-value {{
    color: {COLORS['text_primary']};
    font-size: 1.35rem;
    font-weight: 600;
    font-family: 'JetBrains Mono', monospace;
    letter-spacing: -0.02em;
    line-height: 1.2;
}}
.kpi-delta {{
    font-size: 0.72rem;
    font-family: 'JetBrains Mono', monospace;
    font-weight: 500;
    margin-top: 4px;
}}
.kpi-delta.positive {{ color: {COLORS['accent_green']}; }}
.kpi-delta.negative {{ color: {COLORS['accent_red']}; }}
.kpi-delta.neutral  {{ color: {COLORS['text_secondary']}; }}

/* ── Status Pill ──────────────────────── */
.status-pill {{
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 8px;
    border-radius: 3px;
    font-size: 0.72rem;
    font-weight: 500;
    font-family: 'JetBrains Mono', monospace;
    border: 1px solid {COLORS['border']};
    background: {COLORS['bg_card']};
}}
.status-pill.online  {{ color: {COLORS['accent_green']}; border-color: rgba(62, 168, 116, 0.3); }}
.status-pill.offline {{ color: {COLORS['accent_red']}; border-color: rgba(217, 83, 79, 0.3); }}
.status-pill.degraded {{ color: {COLORS['accent_amber']}; border-color: rgba(231, 183, 90, 0.3); }}

.status-dot {{
    width: 6px;
    height: 6px;
    border-radius: 50%;
    display: inline-block;
}}
.status-dot.online  {{ background: {COLORS['accent_green']}; }}
.status-dot.offline {{ background: {COLORS['accent_red']}; }}
.status-dot.degraded {{ background: {COLORS['accent_amber']}; }}

/* ── Alert badges & Cards ─────────────── */
.severity-badge {{
    display: inline-block;
    padding: 2px 6px;
    border-radius: 2px;
    font-weight: 600;
    font-size: 0.68rem;
    font-family: 'JetBrains Mono', monospace;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}}
.severity-none {{ background: rgba(62,168,116,0.15); color: {COLORS['accent_green']}; border: 1px solid rgba(62,168,116,0.3); }}
.severity-low, .severity-info {{ background: rgba(120,153,184,0.15); color: {COLORS['accent_blue']}; border: 1px solid rgba(120,153,184,0.3); }}
.severity-moderate, .severity-watch {{ background: rgba(231,183,90,0.15); color: {COLORS['accent_amber']}; border: 1px solid rgba(231,183,90,0.3); }}
.severity-high, .severity-severe {{ background: rgba(224,122,95,0.15); color: {COLORS['accent_coral']}; border: 1px solid rgba(224,122,95,0.3); }}
.severity-extreme {{ background: rgba(217,83,79,0.20); color: {COLORS['accent_red']}; border: 1px solid rgba(217,83,79,0.4); }}

/* ── Section Divider ──────────────────── */
.section-divider {{
    height: 1px;
    background: {COLORS['border']};
    margin: 1.5rem 0;
}}

/* ── Empty & Error States ─────────────── */
.empty-state {{
    text-align: center;
    padding: 2.5rem 1.5rem;
    color: {COLORS['text_muted']};
    background: {COLORS['bg_card']};
    border: 1px dashed {COLORS['border']};
    border-radius: 4px;
}}
.empty-state h3 {{
    color: {COLORS['text_secondary']} !important;
    margin-bottom: 0.35rem;
    font-size: 0.95rem !important;
}}
.empty-state p {{
    font-size: 0.82rem;
    color: {COLORS['text_muted']};
    max-width: 420px;
    margin: 0 auto;
}}

/* ── Footer ───────────────────────────── */
.footer-brand {{
    text-align: center;
    padding: 1.25rem 0;
    color: {COLORS['text_muted']};
    font-size: 0.72rem;
    font-family: 'JetBrains Mono', monospace;
    border-top: 1px solid {COLORS['border']};
    margin-top: 2.5rem;
}}
</style>
"""
