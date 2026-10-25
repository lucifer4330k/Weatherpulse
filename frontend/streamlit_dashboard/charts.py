"""
WeatherPulse Dashboard — Chart & Map Visualizations
All Plotly and PyDeck visualizations used across dashboard sections.
"""

from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import pydeck as pdk

from styles import (
    COLORS, TEMP_COLORSCALE, RAIN_COLORSCALE, HUMIDITY_COLORSCALE,
    WIND_COLORSCALE, get_plotly_layout,
)
from data_processing import weather_code_to_emoji, safe_round


# ═══════════════════════════════════════════════════════════════
#  MAPS
# ═══════════════════════════════════════════════════════════════

def india_weather_map(
    df: pd.DataFrame,
    metric: str = "temperature",
    height: int = 600,
) -> Optional[pdk.Deck]:
    """Build a PyDeck scatter-plot map of India with colour-coded markers.

    *df* must contain ``lat``, ``lon`` and the requested *metric* column.
    """
    required = {"lat", "lon", metric}
    if df.empty or not required.issubset(df.columns):
        return None

    map_df = df.dropna(subset=["lat", "lon", metric]).copy()
    if map_df.empty:
        return None

    # Normalise metric to 0–1 for colour mapping
    vmin = map_df[metric].min()
    vmax = map_df[metric].max()
    rng = vmax - vmin if vmax != vmin else 1
    map_df["_norm"] = (map_df[metric] - vmin) / rng

    # Map normalised value to RGB
    cscale = {
        "temperature": _interp_colorscale_rgb,
        "precipitation": lambda v: _interp_simple_rgb(v, (30, 64, 175), (103, 232, 249)),
        "humidity": lambda v: _interp_simple_rgb(v, (245, 158, 11), (59, 130, 246)),
        "wind_speed": lambda v: _interp_simple_rgb(v, (16, 185, 129), (239, 68, 68)),
    }
    color_fn = cscale.get(metric, _interp_colorscale_rgb)
    map_df["_color"] = map_df["_norm"].apply(lambda v: color_fn(v))

    # Tooltip
    name_col = "state_name" if "state_name" in map_df.columns else "city"
    if name_col not in map_df.columns:
        name_col = map_df.columns[0]
    map_df["_tooltip"] = map_df.apply(
        lambda r: f"{r.get(name_col, '—')}: {safe_round(r[metric], 1)} {_metric_unit(metric)}",
        axis=1,
    )

    layer = pdk.Layer(
        "ScatterplotLayer",
        data=map_df,
        get_position=["lon", "lat"],
        get_fill_color="_color",
        get_radius=45000,
        radius_min_pixels=8,
        radius_max_pixels=25,
        pickable=True,
        auto_highlight=True,
        opacity=0.85,
    )

    view = pdk.ViewState(latitude=22.5, longitude=80.0, zoom=4.2, pitch=0)
    tooltip = {"html": "<b>{_tooltip}</b>", "style": {
        "backgroundColor": COLORS["bg_card"],
        "color": COLORS["text_primary"],
        "border": f"1px solid {COLORS['border']}",
        "borderRadius": "8px",
        "padding": "8px 12px",
        "fontSize": "13px",
    }}
    deck = pdk.Deck(
        layers=[layer],
        initial_view_state=view,
        tooltip=tooltip,
        map_style="mapbox://styles/mapbox/dark-v11",
        height=height,
    )
    return deck


def _metric_unit(metric: str) -> str:
    return {"temperature": "°C", "precipitation": "mm", "humidity": "%",
            "wind_speed": "km/h", "pressure": "hPa", "uv_index": ""}.get(metric, "")


def _interp_colorscale_rgb(t: float) -> list:
    """Interpolate the temperature colour scale at position *t* ∈ [0, 1]."""
    scales = TEMP_COLORSCALE
    t = max(0.0, min(1.0, t))
    for i in range(len(scales) - 1):
        t0, c0 = scales[i]
        t1, c1 = scales[i + 1]
        if t0 <= t <= t1:
            frac = (t - t0) / (t1 - t0) if t1 != t0 else 0
            r0, g0, b0 = _hex_to_rgb(c0)
            r1, g1, b1 = _hex_to_rgb(c1)
            return [int(r0 + (r1 - r0) * frac), int(g0 + (g1 - g0) * frac), int(b0 + (b1 - b0) * frac), 220]
    return [200, 200, 200, 200]


def _interp_simple_rgb(t: float, rgb_low: tuple, rgb_high: tuple) -> list:
    t = max(0.0, min(1.0, t))
    return [
        int(rgb_low[0] + (rgb_high[0] - rgb_low[0]) * t),
        int(rgb_low[1] + (rgb_high[1] - rgb_low[1]) * t),
        int(rgb_low[2] + (rgb_high[2] - rgb_low[2]) * t),
        220,
    ]


def _hex_to_rgb(h: str) -> tuple:
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


# ═══════════════════════════════════════════════════════════════
#  BAR CHARTS
# ═══════════════════════════════════════════════════════════════

def top_cities_bar(df: pd.DataFrame, metric: str = "temperature", top_n: int = 15, title: str = "") -> go.Figure:
    """Horizontal bar chart of top N states/cities by a metric."""
    name_col = "state_name" if "state_name" in df.columns else "city"
    sub = df.dropna(subset=[metric]).nlargest(top_n, metric)
    if sub.empty:
        return _empty_figure("No data for this metric")

    color_map = {
        "temperature": COLORS["accent_coral"],
        "precipitation": COLORS["accent_blue"],
        "humidity": COLORS["accent_teal"],
        "wind_speed": COLORS["accent_amber"],
    }
    bar_color = color_map.get(metric, COLORS["accent_cyan"])

    fig = go.Figure(go.Bar(
        x=sub[metric],
        y=sub[name_col],
        orientation="h",
        marker=dict(color=bar_color, line=dict(width=0)),
        text=sub[metric].apply(lambda v: f"{v:.1f}"),
        textposition="outside",
        textfont=dict(color=COLORS["text_secondary"], size=11),
        hovertemplate="%{y}: %{x:.1f} " + _metric_unit(metric) + "<extra></extra>",
    ))
    fig.update_layout(**get_plotly_layout(
        title=dict(text=title or f"Top {top_n} by {metric.replace('_', ' ').title()}", font=dict(size=14)),
        yaxis=dict(autorange="reversed", categoryorder="total ascending"),
        height=max(350, top_n * 30),
        xaxis_title=_metric_unit(metric),
    ))
    return fig


def rainfall_comparison_bar(df: pd.DataFrame, title: str = "Precipitation by Location") -> go.Figure:
    """Bar chart comparing precipitation across all locations."""
    name_col = "state_name" if "state_name" in df.columns else "city"
    sub = df.dropna(subset=["precipitation"]).copy()
    sub = sub[sub["precipitation"] > 0].nlargest(20, "precipitation")
    if sub.empty:
        return _empty_figure("No precipitation recorded")

    fig = go.Figure(go.Bar(
        x=sub[name_col],
        y=sub["precipitation"],
        marker=dict(
            color=sub["precipitation"],
            colorscale=[[0, "#1E3A5F"], [0.5, "#3B82F6"], [1, "#67E8F9"]],
            line=dict(width=0),
        ),
        text=sub["precipitation"].apply(lambda v: f"{v:.1f} mm"),
        textposition="outside",
        textfont=dict(color=COLORS["text_secondary"], size=10),
        hovertemplate="%{x}: %{y:.1f} mm<extra></extra>",
    ))
    fig.update_layout(**get_plotly_layout(
        title=dict(text=title, font=dict(size=14)),
        yaxis_title="mm",
        height=400,
    ))
    return fig


# ═══════════════════════════════════════════════════════════════
#  TIME-SERIES CHARTS
# ═══════════════════════════════════════════════════════════════

def temperature_trend_line(df: pd.DataFrame, time_col: str = "timestamp",
                           title: str = "Temperature Trend") -> go.Figure:
    if df.empty or time_col not in df.columns or "temperature" not in df.columns:
        return _empty_figure("No temperature data")

    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=df[time_col], y=df["temperature"],
        mode="lines",
        line=dict(color=COLORS["accent_coral"], width=2),
        fill="tozeroy",
        fillcolor="rgba(249,115,22,0.08)",
        name="Temperature",
        hovertemplate="%{x|%d %b %H:%M}<br>%{y:.1f} °C<extra></extra>",
    ))
    fig.update_layout(**get_plotly_layout(
        title=dict(text=title, font=dict(size=14)),
        yaxis_title="°C",
        height=350,
    ))
    return fig


def precipitation_trend_line(df: pd.DataFrame, time_col: str = "timestamp",
                              title: str = "Precipitation Trend") -> go.Figure:
    if df.empty or time_col not in df.columns or "precipitation" not in df.columns:
        return _empty_figure("No precipitation data")

    fig = go.Figure()
    fig.add_trace(go.Bar(
        x=df[time_col], y=df["precipitation"],
        marker=dict(color=COLORS["accent_blue"], line=dict(width=0)),
        name="Precipitation",
        hovertemplate="%{x|%d %b %H:%M}<br>%{y:.1f} mm<extra></extra>",
    ))
    fig.update_layout(**get_plotly_layout(
        title=dict(text=title, font=dict(size=14)),
        yaxis_title="mm",
        height=350,
    ))
    return fig


def humidity_trend_line(df: pd.DataFrame, time_col: str = "timestamp",
                         title: str = "Humidity Trend") -> go.Figure:
    if df.empty or time_col not in df.columns or "humidity" not in df.columns:
        return _empty_figure("No humidity data")

    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=df[time_col], y=df["humidity"],
        mode="lines",
        line=dict(color=COLORS["accent_teal"], width=2),
        fill="tozeroy",
        fillcolor="rgba(20,184,166,0.08)",
        name="Humidity",
        hovertemplate="%{x|%d %b %H:%M}<br>%{y}%<extra></extra>",
    ))
    fig.update_layout(**get_plotly_layout(
        title=dict(text=title, font=dict(size=14)),
        yaxis_title="%",
        height=350,
    ))
    return fig


def wind_trend_line(df: pd.DataFrame, time_col: str = "timestamp",
                     title: str = "Wind Speed Trend") -> go.Figure:
    if df.empty or time_col not in df.columns or "wind_speed" not in df.columns:
        return _empty_figure("No wind speed data")

    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=df[time_col], y=df["wind_speed"],
        mode="lines",
        line=dict(color=COLORS["accent_amber"], width=2),
        fill="tozeroy",
        fillcolor="rgba(245,158,11,0.08)",
        name="Wind Speed",
        hovertemplate="%{x|%d %b %H:%M}<br>%{y:.1f} km/h<extra></extra>",
    ))
    fig.update_layout(**get_plotly_layout(
        title=dict(text=title, font=dict(size=14)),
        yaxis_title="km/h",
        height=350,
    ))
    return fig


def multi_metric_comparison(
    dfs: Dict[str, pd.DataFrame],
    metric: str,
    time_col: str = "timestamp",
    title: str = "",
) -> go.Figure:
    """Overlay the same metric from multiple locations on a single chart."""
    palette = [COLORS["accent_cyan"], COLORS["accent_coral"], COLORS["accent_amber"],
               COLORS["accent_teal"], COLORS["accent_purple"], COLORS["accent_green"]]
    fig = go.Figure()
    for idx, (name, df) in enumerate(dfs.items()):
        if df.empty or metric not in df.columns or time_col not in df.columns:
            continue
        fig.add_trace(go.Scatter(
            x=df[time_col], y=df[metric],
            mode="lines",
            name=name,
            line=dict(color=palette[idx % len(palette)], width=2),
            hovertemplate=f"{name}<br>%{{x|%d %b %H:%M}}<br>%{{y:.1f}}<extra></extra>",
        ))
    fig.update_layout(**get_plotly_layout(
        title=dict(text=title or f"{metric.replace('_', ' ').title()} Comparison", font=dict(size=14)),
        yaxis_title=_metric_unit(metric),
        height=400,
    ))
    return fig


# ═══════════════════════════════════════════════════════════════
#  FORECAST CHARTS
# ═══════════════════════════════════════════════════════════════

def hourly_forecast_chart(df: pd.DataFrame, title: str = "48-Hour Forecast") -> go.Figure:
    if df.empty or "time" not in df.columns:
        return _empty_figure("No forecast data")

    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=df["time"], y=df["temperature"],
        name="Temperature",
        line=dict(color=COLORS["accent_coral"], width=2.5),
        hovertemplate="%{x|%d %b %H:%M}<br>%{y:.1f} °C<extra></extra>",
    ))
    if "precipitation" in df.columns:
        fig.add_trace(go.Bar(
            x=df["time"], y=df["precipitation"],
            name="Precipitation",
            yaxis="y2",
            marker=dict(color=COLORS["accent_blue"], opacity=0.5),
            hovertemplate="%{x|%d %b %H:%M}<br>%{y:.1f} mm<extra></extra>",
        ))
    fig.update_layout(**get_plotly_layout(
        title=dict(text=title, font=dict(size=14)),
        yaxis=dict(title="°C", side="left", gridcolor="rgba(51,65,85,0.4)"),
        yaxis2=dict(title="mm", side="right", overlaying="y", showgrid=False),
        height=380,
        legend=dict(x=0.01, y=0.99),
    ))
    return fig


def daily_forecast_chart(df: pd.DataFrame, title: str = "7-Day Forecast") -> go.Figure:
    if df.empty or "date" not in df.columns:
        return _empty_figure("No daily forecast data")

    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=df["date"], y=df["temperature_max"],
        name="High",
        line=dict(color=COLORS["accent_coral"], width=2.5),
        mode="lines+markers",
        marker=dict(size=7),
        hovertemplate="%{x|%d %b}<br>High: %{y:.1f} °C<extra></extra>",
    ))
    fig.add_trace(go.Scatter(
        x=df["date"], y=df["temperature_min"],
        name="Low",
        line=dict(color=COLORS["accent_cyan"], width=2.5),
        mode="lines+markers",
        marker=dict(size=7),
        fill="tonexty",
        fillcolor="rgba(6,182,212,0.08)",
        hovertemplate="%{x|%d %b}<br>Low: %{y:.1f} °C<extra></extra>",
    ))
    if "precipitation_sum" in df.columns:
        fig.add_trace(go.Bar(
            x=df["date"], y=df["precipitation_sum"],
            name="Rain",
            yaxis="y2",
            marker=dict(color=COLORS["accent_blue"], opacity=0.4),
            hovertemplate="%{x|%d %b}<br>Rain: %{y:.1f} mm<extra></extra>",
        ))
    fig.update_layout(**get_plotly_layout(
        title=dict(text=title, font=dict(size=14)),
        yaxis=dict(title="°C", side="left", gridcolor="rgba(51,65,85,0.4)"),
        yaxis2=dict(title="mm", side="right", overlaying="y", showgrid=False),
        height=380,
    ))
    return fig


# ═══════════════════════════════════════════════════════════════
#  HELPERS
# ═══════════════════════════════════════════════════════════════

def _empty_figure(message: str = "No data") -> go.Figure:
    fig = go.Figure()
    fig.add_annotation(text=message, x=0.5, y=0.5, xref="paper", yref="paper",
                       showarrow=False, font=dict(color=COLORS["text_muted"], size=14))
    fig.update_layout(**get_plotly_layout(height=250))
    fig.update_xaxes(visible=False)
    fig.update_yaxes(visible=False)
    return fig
