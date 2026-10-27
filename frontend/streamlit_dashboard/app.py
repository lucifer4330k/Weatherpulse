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
    page_title="WeatherPulse — Weather Intelligence",
    page_icon="⚡",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Now import our modules
from styles import GLOBAL_CSS, COLORS
from api_client import (
    check_backend_status, clear_all_caches,
    fetch_india_overview, fetch_india_states,
    fetch_current_weather, fetch_forecast,
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
    temperature_distribution_histogram, temp_vs_humidity_scatter,
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
            f'<div style="padding:0.4rem 0 0.8rem 0;">'
            f'<div style="color:{COLORS["text_primary"]};font-size:1.15rem;font-weight:700;letter-spacing:-0.02em;">'
            f'Weather<span style="color:{COLORS["accent_amber"]};">Pulse</span>'
            f'</div>'
            f'<div style="color:{COLORS["text_muted"]};font-size:0.72rem;font-family:\'JetBrains Mono\', monospace;letter-spacing:0.04em;">'
            f'METEOROLOGICAL INTELLIGENCE</div>'
            f'</div>',
            unsafe_allow_html=True,
        )
        st.markdown("---")

        # Navigation
        page = st.radio(
            "NAVIGATION",
            [
                "Overview",
                "Weather Map",
                "Rainfall Analytics",
                "Extreme Weather",
                "City Explorer",
                "Historical Trends",
                "Location Search",
                "Pipeline Health",
            ],
            label_visibility="collapsed",
        )

        st.markdown("---")

        # Connection info
        st.markdown(f'<div style="color:{COLORS["text_muted"]};font-size:0.68rem;'
                    f'text-transform:uppercase;letter-spacing:0.08em;font-weight:600;margin-bottom:6px;">Service Status</div>',
                    unsafe_allow_html=True)
        status = check_backend_status()
        if status["online"]:
            status_pill("FastAPI Connected", "online")
        else:
            status_pill("Backend Offline", "offline")

        st.caption(f"`{BACKEND_URL}`")

        # Refresh button
        if st.button("Refresh Telemetry", use_container_width=True, key="sidebar_refresh"):
            clear_all_caches()
            st.rerun()

        st.markdown("---")

        # Threshold config (used by Extreme Weather page)
        with st.expander("Threshold Configuration"):
            st.caption("Screening limits for statistical hazard flags.")
            heat_high = st.slider("Heat Flag (°C)", 30, 50, int(DEFAULT_THRESHOLDS["heat_high"]), key="th_heat")
            rain_high = st.slider("Rain Flag (mm)", 10, 200, int(DEFAULT_THRESHOLDS["rain_high"]), key="th_rain")
            wind_high = st.slider("Wind Flag (km/h)", 30, 150, int(DEFAULT_THRESHOLDS["wind_high"]), key="th_wind")
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
            f'font-size:0.68rem;font-family:\'JetBrains Mono\', monospace;text-align:center;">'
            f'v2.0 · Streamlit Analytics<br>Cloud Computing & Big Data</div>',
            unsafe_allow_html=True,
        )

    return page


# ═══════════════════════════════════════════════════════════════
#  PAGES
# ═══════════════════════════════════════════════════════════════

# ── A. Overview ───────────────────────────────────────────────

def page_overview():
    st.markdown(
        f'<div class="editorial-header">'
        f'<div class="editorial-eyebrow">METEOROLOGICAL INTELLIGENCE · PAN-INDIA OBSERVATION NETWORK</div>'
        f'<div class="editorial-title">WeatherPulse Operational Analytics</div>'
        f'<div class="editorial-copy">Stored observations from monitored Indian cities, with measured coverage and streaming pipeline context.</div>'
        f'<div class="editorial-meta"><span class="editorial-dot"></span> PIPELINE: OPEN-METEO / SPARK STREAMING / CASSANDRA</div>'
        f'</div>',
        unsafe_allow_html=True,
    )

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
        kpi_card("Monitored Avg Temp", f"{safe_round(national.get('avg_temperature', kpis['avg_temp']))}", "°C",
                 accent_color=COLORS["accent_amber"])
    with cols[1]:
        kpi_card("Max Recorded Temp", f"{kpis['max_temp']}", "°C",
                 delta=kpis.get("max_temp_state"), delta_direction="neutral",
                 accent_color=COLORS["accent_coral"])
    with cols[2]:
        kpi_card("Min Recorded Temp", f"{kpis['min_temp']}", "°C",
                 delta=kpis.get("min_temp_state"), delta_direction="neutral",
                 accent_color=COLORS["accent_blue"])
    with cols[3]:
        kpi_card("Reporting Cities", f"{national.get('reporting_locations', '—')}/{national.get('monitored_locations', '—')}", "",
                 accent_color=COLORS["accent_green"])
    with cols[4]:
        kpi_card("Mean Sampled Rain", f"{safe_round(national.get('mean_sampled_precipitation', kpis['avg_precip']))}", "mm",
                 accent_color=COLORS["accent_blue"])
    with cols[5]:
        kpi_card("Elevated Alerts", f"{kpis['alert_count']}", "",
                 accent_color=COLORS["severity_watch"])

    st.markdown("")
    data_freshness_indicator(timestamp, datetime.now())

    section_divider()

    # Map + Top cities
    col_map, col_side = st.columns([2, 1])
    with col_map:
        section_header("Geospatial Samples", "One primary city sample per state or UT, plotted at its actual location")
        map_metric = st.selectbox(
            "Observation Metric",
            ["temperature", "precipitation", "humidity", "wind_speed"],
            format_func=lambda m: f"{m.replace('_', ' ').title()} ({_metric_unit(m)})",
            key="overview_map_metric"
        )
        deck = india_weather_map(df, metric=map_metric, height=480)
        if deck:
            st.pydeck_chart(deck, use_container_width=True)
        else:
            empty_state("Map Unavailable", "No valid coordinate records returned by the backend.")

    with col_side:
        section_header("Ranked Observations", f"Top reporting states by {map_metric.replace('_', ' ')}")
        fig = top_cities_bar(df, map_metric, top_n=10, title="")
        st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})

    section_divider()

    # Analytical area: Distributions & Comparisons
    section_header("Analytical Insights & Distribution", "Empirical breakdown of current observation dataset")
    c1, c2 = st.columns([1, 1])
    with c1:
        dist_fig = temperature_distribution_histogram(df)
        st.plotly_chart(dist_fig, use_container_width=True, config={"displayModeBar": False})
    with c2:
        scatter_fig = temp_vs_humidity_scatter(df)
        st.plotly_chart(scatter_fig, use_container_width=True, config={"displayModeBar": False})

    section_divider()

    # Summary table & Deterministic condition summary
    c_summary, c_table = st.columns([1, 2])
    with c_summary:
        section_header("Observation Digest", "Deterministically computed from active payload")
        valid = df.dropna(subset=["temperature"])
        if not valid.empty:
            st.markdown(
                f'<div style="background:{COLORS["bg_card"]};border:1px solid {COLORS["border"]};'
                f'border-radius:4px;padding:16px;font-size:0.84rem;line-height:1.5;">'
                f'<p style="color:{COLORS["text_secondary"]};margin:0 0 10px;">'
                f'Across <strong style="color:{COLORS["text_primary"]};">{len(valid)}</strong> primary city samples (one per reporting state or UT), '
                f'the mean temperature of those primary samples is '
                f'<strong style="color:{COLORS["accent_amber"]};font-family:\'JetBrains Mono\', monospace;">{kpis["avg_temp"]}°C</strong>.'
                f'</p>'
                f'<p style="color:{COLORS["text_secondary"]};margin:0 0 10px;">'
                f'Highest observed reading: <strong style="color:{COLORS["accent_coral"]};">{kpis["max_temp_state"]}</strong> at '
                f'<strong style="font-family:\'JetBrains Mono\', monospace;">{kpis["max_temp"]}°C</strong>.<br>'
                f'Lowest observed reading: <strong style="color:{COLORS["accent_blue"]};">{kpis["min_temp_state"]}</strong> at '
                f'<strong style="font-family:\'JetBrains Mono\', monospace;">{kpis["min_temp"]}°C</strong>.'
                f'</p>'
                f'<p style="color:{COLORS["text_muted"]};font-size:0.75rem;font-family:\'JetBrains Mono\', monospace;margin:0;padding-top:8px;border-top:1px solid {COLORS["border"]};">'
                f'Primary-sample humidity: {safe_round(kpis.get("avg_humidity"))}% · Primary-sample precipitation: {safe_round(kpis.get("avg_precip"))} mm · '
                f'{kpis["alert_count"]} station(s) flagged for monitoring.'
                f'</p>'
                f'</div>',
                unsafe_allow_html=True,
            )
        else:
            empty_state("No Observation Records", "Backend returned no valid state observations.")

    with c_table:
        section_header("Underlying Records", "Sortable and exportable state records")
        display_cols = ["state_name", "state_code", "temperature", "humidity", "wind_speed", "precipitation", "weather_description"]
        avail = [c for c in display_cols if c in df.columns]
        st.dataframe(
            df[avail].sort_values("temperature", ascending=False),
            use_container_width=True,
            hide_index=True,
            height=240,
        )


# ── B. Weather Map ────────────────────────────────────────────

def page_weather_map():
    section_header("Geospatial Surface Visualization", "Observation layers projected onto Indian state centroids")

    overview = fetch_india_overview()
    if not overview:
        backend_offline_state()
        return

    df = overview_to_states_df(overview)

    col_ctrl, col_info = st.columns([3, 1])
    with col_ctrl:
        metric = st.selectbox("Geospatial Layer", ["temperature", "precipitation", "humidity", "wind_speed"],
                              format_func=lambda m: f"{m.replace('_', ' ').title()} ({_metric_unit(m)})",
                              key="map_metric_standalone")
    with col_info:
        valid_count = df[metric].notna().sum()
        st.markdown(f'<div style="padding-top:28px;color:{COLORS["text_muted"]};font-size:0.8rem;font-family:\'JetBrains Mono\', monospace;">'
                    f'REPORTING: {valid_count}/{len(df)} STATIONS</div>', unsafe_allow_html=True)

    deck = india_weather_map(df, metric=metric, height=620)
    if deck:
        st.pydeck_chart(deck, use_container_width=True)
    else:
        empty_state("No Geospatial Data", f"No valid coordinate data available for {metric}.")

    section_divider()

    st.markdown(
        f'<div style="background:{COLORS["bg_card"]};border:1px solid {COLORS["border"]};'
        f'border-radius:4px;padding:12px 16px;font-size:0.78rem;color:{COLORS["text_secondary"]};">'
        f'<strong style="color:{COLORS["text_primary"]};">Geodetic Reference Note:</strong> '
        f'Markers depict discrete station readings at official state administrative centres. '
        f'Values represent measured surface observations, not continuous spatial interpolations.'
        f'</div>',
        unsafe_allow_html=True,
    )

    section_divider()

    with st.expander("Inspection Table & Data Export"):
        display_cols = ["state_name", "state_code", metric, "weather_description", "observation_time"]
        available = [c for c in display_cols if c in df.columns]
        table_df = df[available].dropna(subset=[metric]).sort_values(metric, ascending=False)
        st.dataframe(table_df, use_container_width=True, hide_index=True)

        csv_bytes = table_df.to_csv(index=False).encode('utf-8')
        st.download_button(
            label=f"Download {metric.title()} Records (CSV)",
            data=csv_bytes,
            file_name=f"weatherpulse_{metric}_records.csv",
            mime="text/csv",
        )


# ── C. Rainfall Analytics ────────────────────────────────────

def page_rainfall():
    section_header("Precipitation & Monsoon Analytics", "State-level precipitation monitoring and threshold tracking")

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
        kpi_card("Accumulated Total", f"{total_rain:.1f}", "mm", accent_color=COLORS["accent_blue"])
    with c2:
        kpi_card("Stations with Rain", f"{raining}", f"/ {len(rain_df)}", accent_color=COLORS["accent_teal"])
    with c3:
        kpi_card("Max Precipitation", f"{max_rain:.1f}", "mm", delta=max_rain_loc, delta_direction="neutral",
                 accent_color=COLORS["accent_blue"])
    with c4:
        heavy = (rain_df["precipitation"] >= 25).sum() if not rain_df.empty else 0
        kpi_card("Heavy Rainfall Flags", f"{heavy}", "", accent_color=COLORS["severity_watch"])

    section_divider()

    c1, c2 = st.columns(2)
    with c1:
        fig = rainfall_comparison_bar(df, "Precipitation Across Reporting States")
        st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})
    with c2:
        deck = india_weather_map(df, metric="precipitation", height=380)
        if deck:
            st.pydeck_chart(deck, use_container_width=True)
        else:
            empty_state("No Rainfall Map Data")

    section_divider()

    # Monitoring flags
    section_header("Threshold Screening Flags", "Calculated against configurable monitoring limits")
    th = st.session_state.get("thresholds", DEFAULT_THRESHOLDS)
    flagged = rain_df[rain_df["precipitation"] >= th.get("rain_moderate", 25)].sort_values("precipitation", ascending=False)
    if flagged.empty:
        st.info(f"No reporting states exceed the moderate precipitation threshold ({th.get('rain_moderate', 25):.0f} mm).")
    else:
        for _, row in flagged.iterrows():
            level = "high" if row["precipitation"] >= th.get("rain_high", 50) else "moderate"
            alert_card(
                title=f"{row['state_name']}",
                description=f"Precipitation: {row['precipitation']:.1f} mm — statistical threshold flag",
                severity="severe" if level == "high" else "warning",
                alert_type="precipitation",
                value=row["precipitation"],
                unit=" mm",
                threshold=th.get("rain_high" if level == "high" else "rain_moderate"),
            )
    st.caption("Note: These indicators are algorithmic threshold flags, not official flood warnings issued by national agencies.")


# ── D. Extreme Weather ───────────────────────────────────────

def page_extreme():
    section_header("Extreme Weather Screening", "Statistical screening for unusual or elevated weather conditions")

    overview = fetch_india_overview()
    if not overview:
        backend_offline_state()
        return

    df = overview_to_states_df(overview)
    th = st.session_state.get("thresholds", DEFAULT_THRESHOLDS)
    screened = screen_extremes(df, th)

    flag_cols = [c for c in screened.columns if c.endswith("_flag")]
    high_count = sum((screened[c] == "high").sum() for c in flag_cols)
    mod_count = sum((screened[c] == "moderate").sum() for c in flag_cols)

    c1, c2, c3 = st.columns(3)
    with c1:
        kpi_card("Elevated Severity", str(high_count), "", accent_color=COLORS["accent_red"])
    with c2:
        kpi_card("Moderate Watch", str(mod_count), "", accent_color=COLORS["accent_amber"])
    with c3:
        kpi_card("Nominal Range", str(len(screened) - high_count - mod_count), "",
                 accent_color=COLORS["accent_green"])

    section_divider()

    tabs = st.tabs(["High Temperature", "Low Temperature", "Heavy Rainfall", "High Wind Speed", "Relative Humidity"])

    flag_configs = [
        ("heat_flag", "High Temperature Screening", "temperature", "°C", "heat_high"),
        ("cold_flag", "Low Temperature Screening", "temperature", "°C", "cold_high"),
        ("rain_flag", "Rainfall Screening", "precipitation", "mm", "rain_high"),
        ("wind_flag", "Wind Screening", "wind_speed", "km/h", "wind_high"),
        ("humidity_flag", "Humidity Screening", "humidity", "%", "humidity_high"),
    ]

    for tab, (flag_col, title, metric, unit, th_key) in zip(tabs, flag_configs):
        with tab:
            if flag_col not in screened.columns:
                st.info(f"No {metric} records available for screening.")
                continue
            flagged = screened[screened[flag_col].isin(["moderate", "high"])].sort_values(metric, ascending=False)
            if flagged.empty:
                st.success(f"No locations currently exceed the {title.lower()} threshold ({th.get(th_key, '—')}{unit}).")
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

    st.caption("Thresholds are configurable in the sidebar. Flags represent statistical anomalies rather than regulatory alerts.")


# ── E. City Explorer ─────────────────────────────────────────

def page_city_explorer():
    section_header("Cross-Station Explorer & Comparative Analysis", "Multi-region weather metric comparison")

    overview = fetch_india_overview()
    if not overview:
        backend_offline_state()
        return

    df = overview_to_states_df(overview)
    valid = df.dropna(subset=["temperature"])
    state_names = sorted(valid["state_name"].tolist())

    if not state_names:
        empty_state("No Station Data", "No states returned valid weather observations.")
        return

    selected = st.multiselect("Select states for comparative inspection", state_names,
                              default=state_names[:3] if len(state_names) >= 3 else state_names,
                              max_selections=6, key="compare_states")

    if not selected:
        st.info("Select at least one state above.")
        return

    comp = valid[valid["state_name"].isin(selected)].copy()

    section_header("Side-by-Side Metrics", "Simultaneous readings across chosen locations")
    display_metrics = ["state_name", "temperature", "feels_like", "humidity", "wind_speed",
                       "precipitation", "pressure", "weather_description"]
    avail = [c for c in display_metrics if c in comp.columns]
    styled = comp[avail].set_index("state_name") if "state_name" in avail else comp[avail]
    st.dataframe(styled, use_container_width=True, hide_index=False)

    section_divider()

    # Comparison charts
    metrics = ["temperature", "humidity", "wind_speed", "precipitation", "pressure"]
    metric_sel = st.selectbox("Comparison Variable", metrics,
                              format_func=lambda m: f"{m.replace('_', ' ').title()} ({_metric_unit(m)})",
                              key="comp_metric")

    fig = top_cities_bar(comp, metric_sel, top_n=len(selected),
                         title=f"{metric_sel.replace('_', ' ').title()} Comparison")
    st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})

    section_divider()

    # Historical comparison
    section_header("30-Day Historical Trend Comparison", "Multi-series progression from backend archive")

    hist_metric = st.selectbox("Historical Metric", ["temperature", "precipitation", "humidity"],
                               key="hist_comp_metric")

    hist_dfs = {}
    for sname in selected[:4]:
        row = valid[valid["state_name"] == sname].iloc[0]
        city = row.get("sampled_city")
        h = fetch_cassandra_historical(city, days=30) if isinstance(city, str) and city else None
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
                                       title=f"{hist_metric.replace('_', ' ').title()} — 30-Day Historical Overlay")
        st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})
    else:
        empty_state("No Historical Records", "Backend returned no historical data points for the selected locations.")


# ── F. Historical Trends ─────────────────────────────────────

def page_historical():
    section_header("Historical Time-Series Analytics", "Persisted observations from the Airflow / Kafka / Spark / Cassandra pipeline")

    overview = fetch_india_overview()
    if not overview:
        backend_offline_state()
        return

    available = fetch_cassandra_cities() or {}
    state_options = sorted(available.get("cities", []))

    if not state_options:
        empty_state("No Stored Observations", "The ingestion pipeline has not persisted any monitored city yet.")
        return

    c1, c2 = st.columns([2, 1])
    with c1:
        sel_state = st.selectbox("Monitored City", state_options, key="hist_state")
    with c2:
        days = st.selectbox("Observation Window", [7, 14, 30, 60, 92], index=2,
                            format_func=lambda d: f"Past {d} days", key="hist_days")

    trends = fetch_cassandra_historical(sel_state, days=days)

    if not trends:
        empty_state("No Historical Records", f"Backend returned no historical records for {sel_state}.")
        return

    summary = trends_summary(trends)

    # Summary KPIs
    c1, c2, c3, c4 = st.columns(4)
    with c1:
        kpi_card("Period Avg Temp", f"{safe_round(summary.get('temp_avg'))}", "°C",
                 accent_color=COLORS["accent_amber"])
    with c2:
        kpi_card("Temperature Range", f"{safe_round(summary.get('temp_min'))} – {safe_round(summary.get('temp_max'))}", "°C",
                 accent_color=COLORS["accent_coral"])
    with c3:
        kpi_card("Mean Sampled Precipitation", f"{safe_round(summary.get('precip_avg'))}", "mm",
                 accent_color=COLORS["accent_blue"])
    with c4:
        kpi_card("Average Humidity", f"{safe_round(summary.get('humidity_avg'))}", "%",
                 accent_color=COLORS["accent_teal"])

    section_divider()

    temp_df = trends_temperature_to_df(trends)
    precip_df = trends_precipitation_to_df(trends)
    humid_df = trends_humidity_to_df(trends)

    if not temp_df.empty:
        temp_df = downsample_df(temp_df, "timestamp", 500)
    if not precip_df.empty:
        precip_df = downsample_df(precip_df, "timestamp", 500)
    if not humid_df.empty:
        humid_df = downsample_df(humid_df, "timestamp", 500)

    tabs = st.tabs(["Temperature", "Precipitation", "Humidity", "Wind Speed"])

    with tabs[0]:
        fig = temperature_trend_line(temp_df, title=f"Temperature History — {sel_state} ({days}d)")
        st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})

    with tabs[1]:
        fig = precipitation_trend_line(precip_df, title=f"Precipitation History — {sel_state} ({days}d)")
        st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})

    with tabs[2]:
        fig = humidity_trend_line(humid_df, title=f"Humidity History — {sel_state} ({days}d)")
        st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})

    with tabs[3]:
        wind_df = trends_temperature_to_df(trends)
        if not wind_df.empty and "wind_speed" in wind_df.columns:
            wind_df = downsample_df(wind_df, "timestamp", 500)
            fig = wind_trend_line(wind_df, title=f"Wind Speed History — {sel_state} ({days}d)")
        else:
            from charts import _empty_figure
            fig = _empty_figure("Wind speed data unavailable for this window")
        st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})

    section_divider()

    # Detailed statistics
    with st.expander("Summary Statistics & CSV Export"):
        if not temp_df.empty and "temperature" in temp_df.columns:
            stats = temp_df["temperature"].describe().round(2)
            st.write("**Temperature Statistics (°C)**")
            st.dataframe(stats.to_frame().T, use_container_width=True, hide_index=True)

        if not temp_df.empty:
            csv_bytes = temp_df.to_csv(index=False).encode('utf-8')
            st.download_button(
                label="Export Time-Series CSV",
                data=csv_bytes,
                file_name=f"weatherpulse_{sel_state.lower().replace(' ', '_')}_{days}d.csv",
                mime="text/csv",
            )

    st.caption(f"Data source: Cassandra persisted observations for {sel_state}. Each point is an ingested provider observation, not a daily total.")


# ── G. Location Search ───────────────────────────────────────

def page_location_search():
    section_header("Geocoded Station Query", "Resolve coordinates and retrieve high-resolution telemetry")

    query = st.text_input("Enter city or district name", placeholder="e.g. Mumbai, Shimla, Varanasi, Bangalore",
                          key="loc_search")

    if not query or len(query) < 2:
        st.info("Input at least 2 characters to trigger the geocoder.")
        return

    results = fetch_geocode(query)
    if not results:
        empty_state("No Matches Found", f'No Indian locations resolved for "{query}". Try another spelling.')
        return

    loc_options = {f"{r['name']} ({r.get('admin1', '')}, {r.get('country', 'IN')})": r for r in results}
    selected_key = st.selectbox("Resolved Locations", list(loc_options.keys()), key="loc_select")
    loc = loc_options[selected_key]

    lat, lon = loc["latitude"], loc["longitude"]
    st.markdown(f'<div style="color:{COLORS["text_muted"]};font-size:0.75rem;font-family:\'JetBrains Mono\', monospace;margin-bottom:12px;">'
                f'COORDINATES: {lat:.4f}°N, {lon:.4f}°E · ELEVATION: {loc.get("elevation", "—")}m</div>',
                unsafe_allow_html=True)

    with st.spinner("Fetching station payload…"):
        dashboard = fetch_dashboard(lat, lon, name=loc["name"])

    if not dashboard:
        error_state("Retrieval Error", f"Backend returned no data payload for {loc['name']}.")
        return

    current = dashboard.get("current")
    if current:
        section_header("Current Surface Observations")
        obs_time = safe_parse_datetime(current.get("time"))
        data_freshness_indicator(obs_time, datetime.now())
        st.markdown("")

        c1, c2, c3, c4, c5, c6 = st.columns(6)
        with c1:
            kpi_card("Temperature", f"{current['temperature']}", "°C",
                     accent_color=COLORS["accent_amber"])
        with c2:
            kpi_card("Feels Like", f"{current['feels_like']}", "°C",
                     accent_color=COLORS["accent_coral"])
        with c3:
            kpi_card("Humidity", f"{current['humidity']}", "%",
                     accent_color=COLORS["accent_teal"])
        with c4:
            kpi_card("Wind Speed", f"{current['wind_speed']}", "km/h",
                     delta=current.get('wind_direction_text'), delta_direction="neutral",
                     accent_color=COLORS["accent_coral"])
        with c5:
            kpi_card("Precipitation", f"{current['precipitation']}", "mm",
                     accent_color=COLORS["accent_blue"])
        with c6:
            kpi_card("Pressure", f"{current['pressure']:.0f}", "hPa",
                     accent_color=COLORS["accent_indigo"])

        st.markdown(
            f'<div style="background:{COLORS["bg_card"]};border:1px solid {COLORS["border"]};'
            f'border-radius:4px;padding:10px 14px;margin-top:0.75rem;font-size:0.8rem;color:{COLORS["text_secondary"]};">'
            f'<strong style="color:{COLORS["text_primary"]};">{current.get("weather_description", "—")}</strong> · '
            f'Cloud Cover: {current.get("cloud_cover", "—")}% · '
            f'Visibility: {safe_round(current.get("visibility"))} km · '
            f'UV Index: {safe_round(current.get("uv_index"))}'
            f'</div>',
            unsafe_allow_html=True,
        )

    section_divider()

    hourly = dashboard.get("hourly", [])
    daily = dashboard.get("daily", [])
    if hourly or daily:
        section_header("Numerical Weather Prediction", "Deterministic model output from Open-Meteo API")
        fc1, fc2 = st.columns(2)
        with fc1:
            h_df = hourly_forecast_to_df(hourly)
            fig = hourly_forecast_chart(h_df, title="Hourly Forecast (Next 48 Hours)")
            st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})
        with fc2:
            d_df = daily_forecast_to_df(daily)
            fig = daily_forecast_chart(d_df, title="7-Day Synoptic Forecast")
            st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})

    alerts = dashboard.get("alerts", [])
    if alerts:
        section_divider()
        section_header("Station Weather Alerts", "Rule-based threshold triggers")
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


# ── H. Pipeline Health ───────────────────────────────────────

def page_pipeline_health():
    section_header("Streaming Architecture & Telemetry", "Infrastructure status of the Big Data pipeline components")

    section_header("FastAPI Service Status", "API Gateway and microservice health")
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
                f'<div style="text-align:center;padding:16px;background:{COLORS["bg_card"]};border:1px solid {COLORS["border"]};border-radius:4px;">'
                f'<div class="status-dot {badge_cls}" style="width:14px;height:14px;margin:0 auto 8px;"></div>'
                f'<div style="color:{COLORS["text_primary"]};font-size:1.1rem;font-weight:700;font-family:\'JetBrains Mono\', monospace;">'
                f'{status.upper()}</div>'
                f'<div style="color:{COLORS["text_muted"]};font-size:0.75rem;font-family:\'JetBrains Mono\', monospace;margin-top:4px;">'
                f'{format_timestamp(ts)}</div>'
                f'</div>',
                unsafe_allow_html=True,
            )
        with c2:
            for svc_name, svc_status in services.items():
                is_ok = svc_status == "healthy"
                color = COLORS["accent_green"] if is_ok else COLORS["accent_amber"] if "not_init" in str(svc_status) else COLORS["accent_red"]
                st.markdown(
                    f'<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;'
                    f'background:{COLORS["bg_card"]};border:1px solid {COLORS["border"]};border-radius:4px;margin-bottom:6px;">'
                    f'<span class="status-dot" style="background:{color};"></span>'
                    f'<span style="color:{COLORS["text_primary"]};font-weight:500;font-size:0.85rem;">{svc_name.replace("_", " ").title()}</span>'
                    f'<span style="color:{color};font-size:0.75rem;font-family:\'JetBrains Mono\', monospace;margin-left:auto;">{svc_status}</span>'
                    f'</div>',
                    unsafe_allow_html=True,
                )

    section_divider()

    # Cassandra Data Store
    section_header("Apache Cassandra Data Archive", "Persistent storage for ingested time-series observations")
    cities_data = fetch_cassandra_cities()
    if cities_data and isinstance(cities_data, dict):
        cities = cities_data.get("cities", [])
        count = cities_data.get("count", len(cities))

        c1, c2 = st.columns(2)
        with c1:
            kpi_card("Persisted Cities", str(count), "", accent_color=COLORS["accent_blue"])
        with c2:
            if cities:
                kpi_card("Sample Stations", ", ".join(cities[:4]), "", accent_color=COLORS["accent_teal"])

        if cities:
            st.markdown("")
            sel_city = st.selectbox("Inspect latest database record", cities, key="cass_city")
            latest = fetch_cassandra_latest(sel_city)
            if latest:
                section_header(f"Database Record: {sel_city}")
                st.json(latest)
            else:
                st.info(f"No records returned for {sel_city} from Cassandra.")
    else:
        st.markdown(
            f'<div class="empty-state">'
            f'<h3>Cassandra Cluster Disconnected or Empty</h3>'
            f'<p>The Cassandra endpoint returned no records. Ensure that Cassandra is running and Kafka/Spark ingestion has populated the table.</p>'
            f'</div>',
            unsafe_allow_html=True,
        )

    section_divider()

    # Pipeline architecture info
    section_header("Distributed Architecture Specifications", "Full-stack components across ingest, storage, and presentation")
    st.markdown(
        f'<div style="background:{COLORS["bg_card"]};border:1px solid {COLORS["border"]};'
        f'border-radius:4px;padding:16px;">'
        f'<table style="width:100%;border-collapse:separate;border-spacing:0 6px;font-size:0.82rem;">'
        f'<tr><td style="color:{COLORS["text_secondary"]};font-weight:600;width:200px;">Data Ingestion</td>'
        f'<td style="color:{COLORS["text_primary"]};font-family:\'JetBrains Mono\', monospace;">Open-Meteo API (hourly poll)</td></tr>'
        f'<tr><td style="color:{COLORS["text_secondary"]};font-weight:600;">Message Bus</td>'
        f'<td style="color:{COLORS["text_primary"]};font-family:\'JetBrains Mono\', monospace;">Apache Kafka</td></tr>'
        f'<tr><td style="color:{COLORS["text_secondary"]};font-weight:600;">Streaming Compute</td>'
        f'<td style="color:{COLORS["text_primary"]};font-family:\'JetBrains Mono\', monospace;">Apache Spark Structured Streaming</td></tr>'
        f'<tr><td style="color:{COLORS["text_secondary"]};font-weight:600;">NoSQL Primary Store</td>'
        f'<td style="color:{COLORS["text_primary"]};font-family:\'JetBrains Mono\', monospace;">Apache Cassandra</td></tr>'
        f'<tr><td style="color:{COLORS["text_secondary"]};font-weight:600;">Distributed Cache</td>'
        f'<td style="color:{COLORS["text_primary"]};font-family:\'JetBrains Mono\', monospace;">Redis</td></tr>'
        f'<tr><td style="color:{COLORS["text_secondary"]};font-weight:600;">Pipeline Orchestration</td>'
        f'<td style="color:{COLORS["text_primary"]};font-family:\'JetBrains Mono\', monospace;">Apache Airflow</td></tr>'
        f'<tr><td style="color:{COLORS["text_secondary"]};font-weight:600;">Backend API</td>'
        f'<td style="color:{COLORS["text_primary"]};font-family:\'JetBrains Mono\', monospace;">FastAPI</td></tr>'
        f'<tr><td style="color:{COLORS["text_secondary"]};font-weight:600;">Dashboards</td>'
        f'<td style="color:{COLORS["text_primary"]};">React 18 + MapLibre GL · Streamlit Intelligence Hub</td></tr>'
        f'</table>'
        f'</div>',
        unsafe_allow_html=True,
    )


# ═══════════════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════════════

def main():
    page = render_sidebar()

    page_map = {
        "Overview": page_overview,
        "Weather Map": page_weather_map,
        "Rainfall Analytics": page_rainfall,
        "Extreme Weather": page_extreme,
        "City Explorer": page_city_explorer,
        "Historical Trends": page_historical,
        "Location Search": page_location_search,
        "Pipeline Health": page_pipeline_health,
    }

    render_fn = page_map.get(page, page_overview)
    render_fn()

    footer()


if __name__ == "__main__":
    main()
