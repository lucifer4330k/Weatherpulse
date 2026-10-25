"""
WeatherPulse — India Weather Intelligence Dashboard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
A standalone Streamlit analytics dashboard that consumes the existing
FastAPI backend and presents real-time weather monitoring, heatmaps,
rainfall analytics, extreme-weather screening, historical trends,
and pipeline-health information for India.

Run:
    streamlit run frontend/streamlit_dashboard/app.py --server.port 8501
"""

import sys
import os
from datetime import datetime
from pathlib import Path

# Ensure the dashboard package is importable when launched from repo root
sys.path.insert(0, str(Path(__file__).resolve().parent))

import streamlit as st
import pandas as pd

# ── Page config (must be first Streamlit call) ──────────────────
st.set_page_config(
    page_title="WeatherPulse — India Weather Intelligence",
    page_icon="🌦️",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Now import our modules
from styles import GLOBAL_CSS, COLORS
from api_client import (
    check_backend_status, clear_all_caches,
    fetch_india_overview, fetch_india_states,
    fetch_current_weather, fetch_forecast, fetch_historical,
    fetch_alerts, fetch_dashboard, fetch_geocode,
    fetch_health, fetch_cassandra_cities,
    fetch_cassandra_latest, fetch_cassandra_historical,
    BACKEND_URL,
)
from data_processing import (
    overview_to_states_df, compute_overview_kpis,
    hourly_forecast_to_df, daily_forecast_to_df,
    trends_temperature_to_df, trends_precipitation_to_df,
    trends_humidity_to_df, trends_summary,
    alerts_to_df, screen_extremes, safe_parse_datetime,
    format_timestamp, validate_coordinates, weather_code_to_emoji,
    safe_round, downsample_df, DEFAULT_THRESHOLDS,
)
from components import (
    kpi_card, status_pill, connection_banner,
    data_freshness_indicator, severity_badge,
    alert_card, empty_state, error_state,
    backend_offline_state, section_divider, section_header, footer,
)
from charts import (
    india_weather_map, top_cities_bar, rainfall_comparison_bar,
    temperature_trend_line, precipitation_trend_line,
    humidity_trend_line, wind_trend_line,
    multi_metric_comparison,
    hourly_forecast_chart, daily_forecast_chart,
    _metric_unit,
)


# ── Inject global CSS ──────────────────────────────────────────
st.markdown(GLOBAL_CSS, unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════════════
#  SIDEBAR
# ═══════════════════════════════════════════════════════════════

def render_sidebar():
    with st.sidebar:
        st.markdown(
            f'<h1 style="font-size:1.6rem;margin-bottom:0;">🌦️ WeatherPulse</h1>'
            f'<p style="color:{COLORS["text_muted"]};font-size:0.78rem;margin-top:4px;">'
            f'India Weather Intelligence</p>',
            unsafe_allow_html=True,
        )
        st.markdown("---")

        # Navigation
        page = st.radio(
            "NAVIGATION",
            [
                "🏠 Overview",
                "🗺️ Weather Map",
                "🌧️ Rainfall Analytics",
                "⚠️ Extreme Weather",
                "🏙️ City Explorer",
                "📈 Historical Trends",
                "🔍 Location Search",
                "🔧 Pipeline Health",
            ],
            label_visibility="collapsed",
        )

        st.markdown("---")

        # Connection info
        st.markdown(f'<p style="color:{COLORS["text_muted"]};font-size:0.72rem;'
                    f'text-transform:uppercase;letter-spacing:0.06em;font-weight:600;">Backend</p>',
                    unsafe_allow_html=True)
        status = check_backend_status()
        if status["online"]:
            status_pill("Connected", "online")
        else:
            status_pill("Offline", "offline")

        st.caption(f"`{BACKEND_URL}`")

        # Refresh button
        if st.button("🔄 Refresh Data", use_container_width=True, key="sidebar_refresh"):
            clear_all_caches()
            st.rerun()

        st.markdown("---")

        # Threshold config (used by Extreme Weather page)
        with st.expander("⚙️ Screening Thresholds"):
            st.caption("Dashboard-calculated flags, not official warnings.")
            heat_high = st.slider("Heat High (°C)", 30, 50, int(DEFAULT_THRESHOLDS["heat_high"]), key="th_heat")
            rain_high = st.slider("Rain High (mm)", 10, 200, int(DEFAULT_THRESHOLDS["rain_high"]), key="th_rain")
            wind_high = st.slider("Wind High (km/h)", 30, 150, int(DEFAULT_THRESHOLDS["wind_high"]), key="th_wind")
            st.session_state["thresholds"] = {
                "heat_high": float(heat_high),
                "heat_moderate": float(heat_high - 5),
                "rain_high": float(rain_high),
                "rain_moderate": float(rain_high / 2),
                "wind_high": float(wind_high),
                "wind_moderate": float(wind_high * 0.67),
            }

        st.markdown(
            f'<div style="margin-top:auto;padding-top:2rem;color:{COLORS["text_muted"]};'
            f'font-size:0.68rem;text-align:center;">'
            f'v1.0 · Streamlit Analytics<br>Cloud Computing & Big Data</div>',
            unsafe_allow_html=True,
        )

    return page


# ═══════════════════════════════════════════════════════════════
#  PAGES
# ═══════════════════════════════════════════════════════════════

# ── A. Overview ───────────────────────────────────────────────

def page_overview():
    st.markdown("# 🌦️ WeatherPulse — India Weather Intelligence")
    st.markdown(f'<p style="color:{COLORS["text_secondary"]};margin-top:-0.5rem;font-size:0.95rem;">'
                f'Real-time monitoring, spatial weather analytics, and historical insights.</p>',
                unsafe_allow_html=True)

    status = check_backend_status()
    connection_banner(status["online"], status["status"], status["checked_at"])

    overview = fetch_india_overview()
    if not overview:
        backend_offline_state()
        return

    df = overview_to_states_df(overview)
    kpis = compute_overview_kpis(df)
    national = overview.get("national", {})
    timestamp = safe_parse_datetime(overview.get("timestamp"))

    # KPI Row
    cols = st.columns(6)
    with cols[0]:
        kpi_card("Avg Temperature", f"{kpis['avg_temp']}", "°C", icon="🌡️",
                 accent_color=COLORS["accent_coral"])
    with cols[1]:
        kpi_card("Hottest", f"{kpis['max_temp']}", "°C",
                 delta=kpis.get("max_temp_state"), delta_direction="neutral",
                 icon="🔥", accent_color=COLORS["accent_red"])
    with cols[2]:
        kpi_card("Coldest", f"{kpis['min_temp']}", "°C",
                 delta=kpis.get("min_temp_state"), delta_direction="neutral",
                 icon="❄️", accent_color=COLORS["accent_cyan"])
    with cols[3]:
        kpi_card("Reporting States", f"{kpis['reporting_states']}/{kpis['total_states']}", "",
                 icon="📡", accent_color=COLORS["accent_blue"])
    with cols[4]:
        kpi_card("Total Precipitation", f"{kpis['total_precip']}", "mm",
                 icon="🌧️", accent_color=COLORS["accent_blue"])
    with cols[5]:
        kpi_card("Alert Locations", f"{kpis['alert_count']}", "",
                 icon="⚠️", accent_color=COLORS["accent_amber"])

    st.markdown("")
    data_freshness_indicator(timestamp, datetime.now())

    section_divider()

    # Map + Top cities
    col_map, col_side = st.columns([2, 1])
    with col_map:
        section_header("India Weather Map", "State-level temperature readings", "🗺️")
        deck = india_weather_map(df, metric="temperature")
        if deck:
            st.pydeck_chart(deck, use_container_width=True)
        else:
            empty_state("Map Unavailable", "No valid coordinate data returned by the backend.")

    with col_side:
        section_header("Top by Temperature", "", "🔥")
        fig = top_cities_bar(df, "temperature", top_n=10, title="")
        st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})

    section_divider()

    # Rainfall + Summary
    c1, c2 = st.columns(2)
    with c1:
        fig = rainfall_comparison_bar(df, title="Precipitation by State")
        st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})
    with c2:
        section_header("Weather Summary", "", "📋")
        valid = df.dropna(subset=["temperature"])
        if not valid.empty:
            st.markdown(
                f'<div style="background:{COLORS["bg_card"]};border:1px solid {COLORS["border"]};'
                f'border-radius:10px;padding:18px;">'
                f'<p style="color:{COLORS["text_secondary"]};font-size:0.85rem;">'
                f'Across <strong style="color:{COLORS["text_primary"]};">{len(valid)}</strong> reporting states, '
                f'the average temperature is <strong style="color:{COLORS["accent_coral"]};">{kpis["avg_temp"]}°C</strong>. '
                f'<strong style="color:{COLORS["accent_red"]};">{kpis["max_temp_state"]}</strong> is the hottest at '
                f'<strong>{kpis["max_temp"]}°C</strong>, while '
                f'<strong style="color:{COLORS["accent_cyan"]};">{kpis["min_temp_state"]}</strong> is the coldest at '
                f'<strong>{kpis["min_temp"]}°C</strong>.'
                f'</p>'
                f'<p style="color:{COLORS["text_muted"]};font-size:0.78rem;margin-top:8px;">'
                f'Average humidity: {kpis.get("avg_humidity", "—")}% · Total precipitation across states: {kpis.get("total_precip", "—")} mm · '
                f'{kpis["alert_count"]} location(s) have elevated alert levels.</p>'
                f'</div>',
                unsafe_allow_html=True,
            )
        else:
            empty_state("No Weather Data", "Backend returned no valid state observations.")


# ── B. Weather Map ────────────────────────────────────────────

def page_weather_map():
    st.markdown("## 🗺️ Interactive India Weather Map")
    st.markdown(f'<p style="color:{COLORS["text_secondary"]};font-size:0.88rem;">'
                f'Geospatial visualisation of state-level weather observations. '
                f'Points represent state centres — not continuous measurements.</p>',
                unsafe_allow_html=True)

    overview = fetch_india_overview()
    if not overview:
        backend_offline_state()
        return

    df = overview_to_states_df(overview)

    col_ctrl, col_info = st.columns([3, 1])
    with col_ctrl:
        metric = st.selectbox("Map Layer", ["temperature", "precipitation", "humidity", "wind_speed"],
                              format_func=lambda m: f"{m.replace('_', ' ').title()} ({_metric_unit(m)})",
                              key="map_metric")
    with col_info:
        valid_count = df[metric].notna().sum()
        st.markdown(f'<div style="padding-top:28px;color:{COLORS["text_muted"]};font-size:0.82rem;">'
                    f'{valid_count}/{len(df)} states reporting</div>', unsafe_allow_html=True)

    deck = india_weather_map(df, metric=metric, height=650)
    if deck:
        st.pydeck_chart(deck, use_container_width=True)
    else:
        empty_state("No Map Data", f"No valid {metric} data available.")

    section_divider()

    # Legend
    st.markdown(f'<div style="background:{COLORS["bg_card"]};border:1px solid {COLORS["border"]};'
                f'border-radius:8px;padding:12px 18px;">'
                f'<p style="color:{COLORS["text_secondary"]};font-size:0.82rem;margin:0;">'
                f'<strong>Legend:</strong> Each point shows the {metric.replace("_", " ")} reading at the '
                f'geographic centre of an Indian state. Colour intensity scales from the lowest to the '
                f'highest observed value. This is <em>not</em> a continuous surface or interpolated heatmap.</p>'
                f'</div>', unsafe_allow_html=True)

    section_divider()
    # Data table
    with st.expander("📊 View Raw Data Table"):
        display_cols = ["state_name", "state_code", metric, "weather_description", "observation_time"]
        available = [c for c in display_cols if c in df.columns]
        st.dataframe(df[available].dropna(subset=[metric]).sort_values(metric, ascending=False),
                     use_container_width=True, hide_index=True)


# ── C. Rainfall Analytics ────────────────────────────────────

def page_rainfall():
    st.markdown("## 🌧️ Rainfall & Monsoon Analytics")
    st.markdown(f'<p style="color:{COLORS["text_secondary"]};font-size:0.88rem;">'
                f'Precipitation analysis across Indian states. All values are current-hour observations '
                f'unless noted otherwise.</p>', unsafe_allow_html=True)

    overview = fetch_india_overview()
    if not overview:
        backend_offline_state()
        return

    df = overview_to_states_df(overview)
    rain_df = df.dropna(subset=["precipitation"]).copy()

    # Summary KPIs
    c1, c2, c3, c4 = st.columns(4)
    total_rain = rain_df["precipitation"].sum() if not rain_df.empty else 0
    raining = (rain_df["precipitation"] > 0).sum() if not rain_df.empty else 0
    max_rain = rain_df["precipitation"].max() if not rain_df.empty else 0
    max_rain_loc = rain_df.loc[rain_df["precipitation"].idxmax(), "state_name"] if not rain_df.empty and max_rain > 0 else "—"

    with c1:
        kpi_card("Total Precipitation", f"{total_rain:.1f}", "mm", icon="🌧️", accent_color=COLORS["accent_blue"])
    with c2:
        kpi_card("Locations with Rain", f"{raining}", f"/ {len(rain_df)}", icon="📍", accent_color=COLORS["accent_teal"])
    with c3:
        kpi_card("Highest Rainfall", f"{max_rain:.1f}", "mm", delta=max_rain_loc, delta_direction="neutral",
                 icon="⛈️", accent_color=COLORS["accent_indigo"])
    with c4:
        heavy = (rain_df["precipitation"] >= 25).sum() if not rain_df.empty else 0
        kpi_card("Heavy Rain Flags", f"{heavy}", "", icon="🚨", accent_color=COLORS["accent_amber"])

    section_divider()

    c1, c2 = st.columns(2)
    with c1:
        fig = rainfall_comparison_bar(df, "Precipitation by State (Current)")
        st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})
    with c2:
        deck = india_weather_map(df, metric="precipitation", height=420)
        if deck:
            st.pydeck_chart(deck, use_container_width=True)
        else:
            empty_state("No Rainfall Map Data")

    section_divider()

    # Monitoring flags
    section_header("Rainfall Monitoring", "States exceeding configurable thresholds (dashboard-calculated)", "⚠️")
    th = st.session_state.get("thresholds", DEFAULT_THRESHOLDS)
    flagged = rain_df[rain_df["precipitation"] >= th.get("rain_moderate", 25)].sort_values("precipitation", ascending=False)
    if flagged.empty:
        st.info(f"No states exceed the moderate rainfall threshold ({th.get('rain_moderate', 25):.0f} mm).")
    else:
        for _, row in flagged.iterrows():
            level = "high" if row["precipitation"] >= th.get("rain_high", 50) else "moderate"
            alert_card(
                title=f"{row['state_name']}",
                description=f"Precipitation: {row['precipitation']:.1f} mm — dashboard screening flag",
                severity="severe" if level == "high" else "warning",
                alert_type="precipitation",
                value=row["precipitation"],
                unit=" mm",
                threshold=th.get("rain_high" if level == "high" else "rain_moderate"),
            )
    st.caption("⚠️ These are dashboard-calculated screening indicators, not flood predictions or official alerts.")


# ── D. Extreme Weather ───────────────────────────────────────

def page_extreme():
    st.markdown("## ⚠️ Extreme Weather Monitoring")
    st.markdown(f'<p style="color:{COLORS["text_secondary"]};font-size:0.88rem;">'
                f'Screening panel for potentially high-impact conditions. '
                f'All flags are calculated by this dashboard using configurable thresholds — '
                f'they are <strong>not</strong> official meteorological warnings.</p>',
                unsafe_allow_html=True)

    overview = fetch_india_overview()
    if not overview:
        backend_offline_state()
        return

    df = overview_to_states_df(overview)
    th = st.session_state.get("thresholds", DEFAULT_THRESHOLDS)
    screened = screen_extremes(df, th)

    # Summary
    flag_cols = [c for c in screened.columns if c.endswith("_flag")]
    high_count = sum((screened[c] == "high").sum() for c in flag_cols)
    mod_count = sum((screened[c] == "moderate").sum() for c in flag_cols)

    c1, c2, c3 = st.columns(3)
    with c1:
        kpi_card("High Priority", str(high_count), "", icon="🔴", accent_color=COLORS["accent_red"])
    with c2:
        kpi_card("Moderate Watch", str(mod_count), "", icon="🟡", accent_color=COLORS["accent_amber"])
    with c3:
        kpi_card("Clear", str(len(screened) - high_count - mod_count), "", icon="🟢",
                 accent_color=COLORS["accent_green"])

    section_divider()

    # Tabs by hazard type
    tabs = st.tabs(["🔥 Heat", "❄️ Cold", "🌧️ Heavy Rain", "💨 High Wind", "💧 Humidity"])

    flag_configs = [
        ("heat_flag", "🔥", "Heat Screening", "temperature", "°C", "heat_high"),
        ("cold_flag", "❄️", "Cold Screening", "temperature", "°C", "cold_high"),
        ("rain_flag", "🌧️", "Rainfall Screening", "precipitation", "mm", "rain_high"),
        ("wind_flag", "💨", "Wind Screening", "wind_speed", "km/h", "wind_high"),
        ("humidity_flag", "💧", "Humidity Screening", "humidity", "%", "humidity_high"),
    ]

    for tab, (flag_col, icon, title, metric, unit, th_key) in zip(tabs, flag_configs):
        with tab:
            if flag_col not in screened.columns:
                st.info(f"No {metric} data available for screening.")
                continue
            flagged = screened[screened[flag_col].isin(["moderate", "high"])].sort_values(metric, ascending=False)
            if flagged.empty:
                st.success(f"No locations exceed the {title.lower()} threshold ({th.get(th_key, '—')}{unit}).")
            else:
                for _, row in flagged.iterrows():
                    sev = "severe" if row[flag_col] == "high" else "warning"
                    alert_card(
                        title=f"{row['state_name']}",
                        description=f"{metric.replace('_', ' ').title()}: {safe_round(row[metric])}{unit}",
                        severity=sev,
                        value=safe_round(row[metric]),
                        unit=unit,
                        threshold=th.get(th_key),
                    )

    st.caption("Threshold values are configurable in the sidebar under ⚙️ Screening Thresholds.")


# ── E. City Explorer ─────────────────────────────────────────

def page_city_explorer():
    st.markdown("## 🏙️ City Explorer & Comparison")
    st.markdown(f'<p style="color:{COLORS["text_secondary"]};font-size:0.88rem;">'
                f'Compare weather across Indian states using the existing backend data.</p>',
                unsafe_allow_html=True)

    overview = fetch_india_overview()
    if not overview:
        backend_offline_state()
        return

    df = overview_to_states_df(overview)
    valid = df.dropna(subset=["temperature"])
    state_names = sorted(valid["state_name"].tolist())

    if not state_names:
        empty_state("No State Data", "No states returned valid weather data.")
        return

    selected = st.multiselect("Select states to compare", state_names,
                              default=state_names[:3] if len(state_names) >= 3 else state_names,
                              max_selections=6, key="compare_states")

    if not selected:
        st.info("Select at least one state above.")
        return

    comp = valid[valid["state_name"].isin(selected)].copy()

    # Comparison table
    section_header("Side-by-Side Comparison", "", "📊")
    display_metrics = ["state_name", "temperature", "feels_like", "humidity", "wind_speed",
                       "precipitation", "pressure", "weather_description"]
    avail = [c for c in display_metrics if c in comp.columns]
    styled = comp[avail].set_index("state_name") if "state_name" in avail else comp[avail]
    st.dataframe(styled, use_container_width=True, hide_index=False)

    section_divider()

    # Comparison charts
    metrics = ["temperature", "humidity", "wind_speed", "precipitation", "pressure"]
    metric_sel = st.selectbox("Comparison Metric", metrics,
                              format_func=lambda m: f"{m.replace('_', ' ').title()} ({_metric_unit(m)})",
                              key="comp_metric")

    fig = top_cities_bar(comp, metric_sel, top_n=len(selected),
                         title=f"{metric_sel.replace('_', ' ').title()} Comparison")
    st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})

    section_divider()

    # Historical comparison
    section_header("Historical Comparison", "30-day trends for selected states (via Open-Meteo)", "📈")
    st.caption("Each state's historical data is fetched from the backend using the state centre coordinates.")

    hist_metric = st.selectbox("Historical Metric", ["temperature", "precipitation", "humidity"],
                               key="hist_comp_metric")

    hist_dfs = {}
    for sname in selected[:4]:  # Limit to 4 for performance
        row = valid[valid["state_name"] == sname].iloc[0]
        h = fetch_historical(row["lat"], row["lon"], days=30)
        if h:
            if hist_metric == "temperature":
                tdf = (h.get("temperature") or {}).get("data", [])
            elif hist_metric == "precipitation":
                tdf = (h.get("precipitation") or {}).get("data", [])
            else:
                tdf = (h.get("humidity") or {}).get("data", [])
            if tdf:
                tmp = pd.DataFrame(tdf)
                if "timestamp" in tmp.columns:
                    tmp["timestamp"] = pd.to_datetime(tmp["timestamp"], errors="coerce", utc=True)
                hist_dfs[sname] = tmp

    if hist_dfs:
        fig = multi_metric_comparison(hist_dfs, hist_metric, "timestamp",
                                       title=f"{hist_metric.replace('_', ' ').title()} — 30-Day Comparison")
        st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})
    else:
        empty_state("No Historical Data", "Backend returned no historical records for the selected states.")

    st.caption("Note: States may have different observation coverage. "
               "Direct time-period comparisons may not align perfectly.")


# ── F. Historical Trends ─────────────────────────────────────

def page_historical():
    st.markdown("## 📈 Historical Trends & Analytics")
    st.markdown(f'<p style="color:{COLORS["text_secondary"]};font-size:0.88rem;">'
                f'Interactive time-series analysis from the backend historical endpoints.</p>',
                unsafe_allow_html=True)

    overview = fetch_india_overview()
    if not overview:
        backend_offline_state()
        return

    df = overview_to_states_df(overview)
    valid = df.dropna(subset=["temperature"])
    state_options = sorted(valid["state_name"].tolist())

    if not state_options:
        empty_state("No states available")
        return

    c1, c2 = st.columns([2, 1])
    with c1:
        sel_state = st.selectbox("Select State", state_options, key="hist_state")
    with c2:
        days = st.selectbox("Time Range", [7, 14, 30, 60, 92], index=2,
                            format_func=lambda d: f"Last {d} days", key="hist_days")

    row = valid[valid["state_name"] == sel_state].iloc[0]
    trends = fetch_historical(row["lat"], row["lon"], days=days)

    if not trends:
        empty_state("No Historical Data", f"Backend returned no historical data for {sel_state}.")
        return

    summary = trends_summary(trends)

    # Summary KPIs
    c1, c2, c3, c4 = st.columns(4)
    with c1:
        kpi_card("Avg Temp", f"{safe_round(summary.get('temp_avg'))}", "°C", icon="🌡️",
                 accent_color=COLORS["accent_coral"])
    with c2:
        kpi_card("Temp Range", f"{safe_round(summary.get('temp_min'))} – {safe_round(summary.get('temp_max'))}", "°C",
                 icon="📐", accent_color=COLORS["accent_blue"])
    with c3:
        kpi_card("Total Precip", f"{safe_round(summary.get('precip_total'))}", "mm",
                 icon="🌧️", accent_color=COLORS["accent_blue"])
    with c4:
        kpi_card("Avg Humidity", f"{safe_round(summary.get('humidity_avg'))}", "%",
                 icon="💧", accent_color=COLORS["accent_teal"])

    section_divider()

    # Charts
    temp_df = trends_temperature_to_df(trends)
    precip_df = trends_precipitation_to_df(trends)
    humid_df = trends_humidity_to_df(trends)

    # Downsample for performance
    if not temp_df.empty:
        temp_df = downsample_df(temp_df, "timestamp", 500)
    if not precip_df.empty:
        precip_df = downsample_df(precip_df, "timestamp", 500)
    if not humid_df.empty:
        humid_df = downsample_df(humid_df, "timestamp", 500)

    tabs = st.tabs(["🌡️ Temperature", "🌧️ Precipitation", "💧 Humidity", "💨 Wind"])

    with tabs[0]:
        fig = temperature_trend_line(temp_df, title=f"Temperature — {sel_state} ({days}d)")
        st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})

    with tabs[1]:
        fig = precipitation_trend_line(precip_df, title=f"Precipitation — {sel_state} ({days}d)")
        st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})

    with tabs[2]:
        fig = humidity_trend_line(humid_df, title=f"Humidity — {sel_state} ({days}d)")
        st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})

    with tabs[3]:
        wind_df = trends_temperature_to_df(trends)  # wind_speed is in the temperature data points
        if not wind_df.empty and "wind_speed" in wind_df.columns:
            wind_df = downsample_df(wind_df, "timestamp", 500)
            fig = wind_trend_line(wind_df, title=f"Wind Speed — {sel_state} ({days}d)")
        else:
            from charts import _empty_figure
            fig = _empty_figure("Wind speed data is within temperature data points")
        st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})

    section_divider()

    # Stats
    with st.expander("📊 Detailed Statistics"):
        if not temp_df.empty and "temperature" in temp_df.columns:
            stats = temp_df["temperature"].describe().round(2)
            st.write("**Temperature Statistics (°C)**")
            st.dataframe(stats.to_frame().T, use_container_width=True, hide_index=True)
        if not precip_df.empty and "precipitation" in precip_df.columns:
            p_stats = precip_df["precipitation"].describe().round(2)
            st.write("**Precipitation Statistics (mm)**")
            st.dataframe(p_stats.to_frame().T, use_container_width=True, hide_index=True)

    st.caption(f"Data source: Backend API → Open-Meteo historical endpoint · Period: {days} days · "
               f"Location: {sel_state} state centre ({row['lat']:.2f}°N, {row['lon']:.2f}°E)")


# ── G. Location Search ───────────────────────────────────────

def page_location_search():
    st.markdown("## 🔍 Location Search & Weather Details")
    st.markdown(f'<p style="color:{COLORS["text_secondary"]};font-size:0.88rem;">'
                f'Search for any Indian location and view detailed weather information.</p>',
                unsafe_allow_html=True)

    query = st.text_input("Search for a city or location in India", placeholder="e.g. Mumbai, Shimla, Varanasi",
                          key="loc_search")

    if not query or len(query) < 2:
        st.info("Enter at least 2 characters to search.")
        return

    results = fetch_geocode(query)
    if not results:
        empty_state("No Results", f'No locations found for "{query}". Try a different spelling or a larger city.')
        return

    # Location selector
    loc_options = {f"{r['name']} ({r.get('admin1', '')}, {r.get('country', 'IN')})": r for r in results}
    selected_key = st.selectbox("Select Location", list(loc_options.keys()), key="loc_select")
    loc = loc_options[selected_key]

    lat, lon = loc["latitude"], loc["longitude"]
    st.markdown(f'<p style="color:{COLORS["text_muted"]};font-size:0.8rem;">'
                f'📍 {lat:.4f}°N, {lon:.4f}°E · Elevation: {loc.get("elevation", "—")}m</p>',
                unsafe_allow_html=True)

    section_divider()

    # Fetch dashboard data
    with st.spinner("Fetching weather data…"):
        dashboard = fetch_dashboard(lat, lon, name=loc["name"])

    if not dashboard:
        error_state("Failed to Load", f"Backend did not return data for {loc['name']}.")
        return

    current = dashboard.get("current")
    if current:
        section_header("Current Weather", "", weather_code_to_emoji(current.get("weather_code", 0)))
        obs_time = safe_parse_datetime(current.get("time"))
        data_freshness_indicator(obs_time, datetime.now())
        st.markdown("")

        c1, c2, c3, c4, c5, c6 = st.columns(6)
        with c1:
            kpi_card("Temperature", f"{current['temperature']}", "°C", icon="🌡️",
                     accent_color=COLORS["accent_coral"])
        with c2:
            kpi_card("Feels Like", f"{current['feels_like']}", "°C", icon="🤒",
                     accent_color=COLORS["accent_amber"])
        with c3:
            kpi_card("Humidity", f"{current['humidity']}", "%", icon="💧",
                     accent_color=COLORS["accent_teal"])
        with c4:
            kpi_card("Wind", f"{current['wind_speed']}", "km/h",
                     delta=current.get('wind_direction_text'), delta_direction="neutral",
                     icon="💨", accent_color=COLORS["accent_blue"])
        with c5:
            kpi_card("Precipitation", f"{current['precipitation']}", "mm", icon="🌧️",
                     accent_color=COLORS["accent_blue"])
        with c6:
            kpi_card("Pressure", f"{current['pressure']:.0f}", "hPa", icon="📊",
                     accent_color=COLORS["accent_purple"])

        st.markdown(
            f'<div style="background:{COLORS["bg_card"]};border:1px solid {COLORS["border"]};'
            f'border-radius:8px;padding:12px 16px;margin-top:1rem;">'
            f'<span style="color:{COLORS["text_secondary"]};font-size:0.85rem;">'
            f'{current.get("weather_description", "—")} · '
            f'Cloud cover: {current.get("cloud_cover", "—")}% · '
            f'Visibility: {safe_round(current.get("visibility"))} km · '
            f'UV Index: {safe_round(current.get("uv_index"))}</span>'
            f'</div>',
            unsafe_allow_html=True,
        )

    section_divider()

    # Forecast
    hourly = dashboard.get("hourly", [])
    daily = dashboard.get("daily", [])
    if hourly or daily:
        section_header("Forecast", "Predicted values — distinct from observations", "🔮")
        fc1, fc2 = st.columns(2)
        with fc1:
            h_df = hourly_forecast_to_df(hourly)
            fig = hourly_forecast_chart(h_df, title="Hourly Forecast")
            st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})
        with fc2:
            d_df = daily_forecast_to_df(daily)
            fig = daily_forecast_chart(d_df, title="Daily Forecast")
            st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})

    # Alerts
    alerts = dashboard.get("alerts", [])
    if alerts:
        section_divider()
        section_header("Weather Alerts", "Backend-generated threshold alerts", "🚨")
        for a in alerts:
            alert_card(
                title=a.get("title", "Alert"),
                description=a.get("description", ""),
                severity=a.get("severity", "info"),
                alert_type=a.get("type", ""),
                value=a.get("current_value"),
                unit=a.get("unit", ""),
                threshold=a.get("threshold"),
            )
        st.caption("These alerts are generated by the backend based on weather thresholds, not official warnings.")


# ── H. Pipeline Health ───────────────────────────────────────

def page_pipeline_health():
    st.markdown("## 🔧 Data & Pipeline Health")
    st.markdown(f'<p style="color:{COLORS["text_secondary"]};font-size:0.88rem;">'
                f'Engineering view of the WeatherPulse Big Data architecture health.</p>',
                unsafe_allow_html=True)

    # API Health
    section_header("API Health", "Backend service status", "🩺")
    health = fetch_health()
    if not health:
        backend_offline_state()
    else:
        status = health.get("status", "unknown")
        services = health.get("services", {})
        ts = safe_parse_datetime(health.get("timestamp"))

        c1, c2 = st.columns([1, 3])
        with c1:
            badge_cls = "online" if status == "healthy" else "degraded" if status == "degraded" else "offline"
            st.markdown(
                f'<div style="text-align:center;padding:20px;">'
                f'<div class="status-dot {badge_cls}" style="width:20px;height:20px;margin:0 auto 10px;"></div>'
                f'<div style="color:{COLORS["text_primary"]};font-size:1.1rem;font-weight:700;">'
                f'{status.upper()}</div>'
                f'<div style="color:{COLORS["text_muted"]};font-size:0.78rem;">{format_timestamp(ts)}</div>'
                f'</div>',
                unsafe_allow_html=True,
            )
        with c2:
            for svc_name, svc_status in services.items():
                icon = "🟢" if svc_status == "healthy" else "🟡" if "not_init" in str(svc_status) else "🔴"
                st.markdown(
                    f'<div style="display:flex;align-items:center;gap:10px;padding:8px 0;'
                    f'border-bottom:1px solid {COLORS["border"]};">'
                    f'<span>{icon}</span>'
                    f'<span style="color:{COLORS["text_primary"]};font-weight:500;">{svc_name.replace("_", " ").title()}</span>'
                    f'<span style="color:{COLORS["text_muted"]};font-size:0.82rem;margin-left:auto;">{svc_status}</span>'
                    f'</div>',
                    unsafe_allow_html=True,
                )

    section_divider()

    # Cassandra Status
    section_header("Cassandra Data Store", "Pipeline-ingested weather records", "🗄️")
    cities_data = fetch_cassandra_cities()
    if cities_data and isinstance(cities_data, dict):
        cities = cities_data.get("cities", [])
        count = cities_data.get("count", len(cities))

        c1, c2 = st.columns(2)
        with c1:
            kpi_card("Cities in Cassandra", str(count), "", icon="🏙️", accent_color=COLORS["accent_blue"])
        with c2:
            if cities:
                kpi_card("Sample Cities", ", ".join(cities[:5]), "",
                         icon="📍", accent_color=COLORS["accent_teal"])

        if cities:
            st.markdown("")
            sel_city = st.selectbox("View latest record for city", cities, key="cass_city")
            latest = fetch_cassandra_latest(sel_city)
            if latest:
                section_header(f"Latest Record: {sel_city}", "", "📋")
                st.json(latest)
            else:
                st.info(f"No records returned for {sel_city} from Cassandra.")
    else:
        st.markdown(
            f'<div class="empty-state">'
            f'<div style="font-size:2rem;">🗄️</div>'
            f'<h3>Cassandra Not Available</h3>'
            f'<p>The Cassandra endpoint returned no data. This is expected if the '
            f'Cassandra cluster is not running or the pipeline has not yet ingested records.</p>'
            f'</div>',
            unsafe_allow_html=True,
        )

    section_divider()

    # Overview Data Stats
    section_header("India Overview Stats", "Data from the overview endpoint", "📊")
    overview = fetch_india_overview()
    if overview:
        df = overview_to_states_df(overview)
        valid = df.dropna(subset=["temperature"])
        c1, c2, c3 = st.columns(3)
        with c1:
            kpi_card("States in Response", str(len(df)), "", icon="🗺️", accent_color=COLORS["accent_blue"])
        with c2:
            kpi_card("Reporting (with data)", str(len(valid)), "", icon="📡", accent_color=COLORS["accent_green"])
        with c3:
            ts = safe_parse_datetime(overview.get("timestamp"))
            kpi_card("Data Timestamp", format_timestamp(ts, "%H:%M:%S"), "", icon="🕐",
                     accent_color=COLORS["accent_cyan"])
    else:
        st.info("Overview data not available.")

    section_divider()

    # Pipeline architecture info
    section_header("Pipeline Architecture", "WeatherPulse Big Data Stack", "🏗️")
    st.markdown(
        f'<div style="background:{COLORS["bg_card"]};border:1px solid {COLORS["border"]};'
        f'border-radius:10px;padding:20px;">'
        f'<table style="width:100%;border-collapse:separate;border-spacing:0 8px;">'
        f'<tr><td style="color:{COLORS["text_secondary"]};font-weight:600;width:180px;">Data Source</td>'
        f'<td style="color:{COLORS["text_primary"]};">Open-Meteo API</td></tr>'
        f'<tr><td style="color:{COLORS["text_secondary"]};font-weight:600;">Message Queue</td>'
        f'<td style="color:{COLORS["text_primary"]};">Apache Kafka</td></tr>'
        f'<tr><td style="color:{COLORS["text_secondary"]};font-weight:600;">Stream Processing</td>'
        f'<td style="color:{COLORS["text_primary"]};">Apache Spark Structured Streaming</td></tr>'
        f'<tr><td style="color:{COLORS["text_secondary"]};font-weight:600;">Data Store</td>'
        f'<td style="color:{COLORS["text_primary"]};">Apache Cassandra</td></tr>'
        f'<tr><td style="color:{COLORS["text_secondary"]};font-weight:600;">Cache Layer</td>'
        f'<td style="color:{COLORS["text_primary"]};">Redis</td></tr>'
        f'<tr><td style="color:{COLORS["text_secondary"]};font-weight:600;">Orchestration</td>'
        f'<td style="color:{COLORS["text_primary"]};">Apache Airflow</td></tr>'
        f'<tr><td style="color:{COLORS["text_secondary"]};font-weight:600;">API Layer</td>'
        f'<td style="color:{COLORS["text_primary"]};">FastAPI</td></tr>'
        f'<tr><td style="color:{COLORS["text_secondary"]};font-weight:600;">Frontend</td>'
        f'<td style="color:{COLORS["text_primary"]};">React + Vite (existing) · Streamlit (this dashboard)</td></tr>'
        f'<tr><td style="color:{COLORS["text_secondary"]};font-weight:600;">Containers</td>'
        f'<td style="color:{COLORS["text_primary"]};">Docker Compose</td></tr>'
        f'</table>'
        f'</div>',
        unsafe_allow_html=True,
    )

    st.markdown("")
    st.markdown(
        f'<div style="background:{COLORS["bg_card"]};border:1px solid {COLORS["border"]};'
        f'border-radius:8px;padding:12px 16px;">'
        f'<p style="color:{COLORS["text_muted"]};font-size:0.82rem;margin:0;">'
        f'<strong>Note:</strong> Kafka consumer lag, Spark throughput, Airflow DAG status, and '
        f'Cassandra cluster metrics are not exposed by the current backend API. '
        f'To display these in the future, add monitoring endpoints (e.g., Kafka JMX, Spark REST API, '
        f'Airflow REST API) to the backend.</p>'
        f'</div>',
        unsafe_allow_html=True,
    )


# ═══════════════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════════════

def main():
    page = render_sidebar()

    page_map = {
        "🏠 Overview": page_overview,
        "🗺️ Weather Map": page_weather_map,
        "🌧️ Rainfall Analytics": page_rainfall,
        "⚠️ Extreme Weather": page_extreme,
        "🏙️ City Explorer": page_city_explorer,
        "📈 Historical Trends": page_historical,
        "🔍 Location Search": page_location_search,
        "🔧 Pipeline Health": page_pipeline_health,
    }

    render_fn = page_map.get(page, page_overview)
    render_fn()

    footer()


if __name__ == "__main__":
    main()
