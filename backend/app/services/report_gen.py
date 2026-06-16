from datetime import datetime

from app.services import mastery as mastery_service
from app.services import weekly_intel
from app.services import study_plan


def generate_mastery_report() -> str:
    all_mastery = mastery_service.compute_all_mastery(use_cache=True)
    intel = weekly_intel.generate_weekly_report()

    total_docs = len(all_mastery)
    avg_mastery = round(sum(d["mastery_score"] for d in all_mastery) / total_docs, 1) if total_docs else 0
    strongest = max(all_mastery, key=lambda d: d["mastery_score"]) if all_mastery else None
    weakest = min(all_mastery, key=lambda d: d["mastery_score"]) if all_mastery else None
    recs = mastery_service.compute_recommendations()

    lines = [
        "# Mastery Progress Report",
        f"**Generated:** {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
        "",
        "## Overview",
        f"| Metric | Value |",
        f"|---|---|",
        f"| Documents | {total_docs} |",
        f"| Current Average Mastery | {avg_mastery}% |",
        f"| Weekly Growth | {f'+{round(intel[\"mastery_growth\"]*100, 1)}%' if intel.get('mastery_growth') is not None else 'N/A'} |",
        f"| Total Study Events (7d) | {intel['total_events']} |",
        f"| Quiz Accuracy (7d) | {f'{round(intel[\"quiz_accuracy\"]*100)}%' if intel.get('quiz_accuracy') is not None else 'N/A'} |",
        "",
    ]

    if strongest:
        lines += [
            "## Strongest Topic",
            f"- **{strongest['pdf_name']}** — {round(strongest['mastery_score'])}% mastery",
            "",
        ]

    if weakest:
        lines += [
            "## Weakest Topic",
            f"- **{weakest['pdf_name']}** — {round(weakest['mastery_score'])}% mastery",
            "",
        ]

    if recs:
        lines += ["## Recommendations", ""]
        for r in recs[:5]:
            lines.append(f"- **{r['pdf_name']}** ({round(r['mastery'])}%): {r['reason']}")
        lines.append("")

    lines += [
        "## All Documents",
        "",
        "| Document | Mastery | Events | Trend |",
        "|---|---|---|---|",
    ]
    for d in sorted(all_mastery, key=lambda x: x["mastery_score"]):
        trend_str = f"+{round(d['trend'])}%" if d.get("trend", 0) > 0 else f"{round(d['trend'])}%" if d.get("trend", 0) < 0 else "stable"
        lines.append(f"| {d['pdf_name']} | {round(d['mastery_score'])}% | {d['total_events']} | {trend_str} |")

    lines.append("")
    lines.append("---")
    lines.append(f"*NoteSmith — AI Study Companion*")

    return "\n".join(lines)


def generate_weekly_summary() -> str:
    intel = weekly_intel.generate_weekly_report()

    lines = [
        "# Weekly Learning Summary",
        f"**Period:** {intel['period_label']}",
        f"**Generated:** {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
        "",
        "## At a Glance",
        f"| Metric | Value |",
        f"|---|---|",
        f"| Study Events | {intel['total_events']} |",
        f"| Active Documents | {intel['active_docs']} |",
        f"| Average Mastery | {intel['avg_mastery']}% |",
        f"| Mastery Growth | {f'+{round(intel[\"mastery_growth\"]*100, 1)}%' if intel.get('mastery_growth') is not None else 'N/A'} |",
        f"| Quiz Accuracy | {f'{round(intel[\"quiz_accuracy\"]*100)}%' if intel.get('quiz_accuracy') is not None else 'N/A'} |",
        "",
    ]

    if intel.get("strongest_topic"):
        lines += [
            "## Strongest Topic",
            f"- **{intel['strongest_topic']['pdf_name']}** — {round(intel['strongest_topic']['mastery'])}% mastery",
            "",
        ]

    if intel.get("weakest_topic"):
        lines += [
            "## Weakest Topic",
            f"- **{intel['weakest_topic']['pdf_name']}** — {round(intel['weakest_topic']['mastery'])}% mastery",
            "",
        ]

    # Activity breakdown
    if intel.get("activity_breakdown"):
        lines += ["## Activity Breakdown", ""]
        for etype, count in intel["activity_breakdown"].items():
            lines.append(f"- **{etype}**: {count} events")
        lines.append("")

    # Heatmap
    if intel.get("heatmap"):
        lines += ["## Daily Activity", ""]
        for d in intel["heatmap"]:
            bar = "█" * min(d["count"], 20) + (" " * max(20 - min(d["count"], 20), 0))
            lines.append(f"  {d['day'].capitalize():3s} |{bar}| {d['count']} events")
        lines.append("")

    lines.append("---")
    lines.append("*NoteSmith — AI Study Companion*")

    return "\n".join(lines)


def generate_full_report() -> str:
    mastery = generate_mastery_report()
    weekly = generate_weekly_summary()
    plan = study_plan.generate_plan()

    lines = [
        "# Complete Study Report",
        f"**Generated:** {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
        "",
    ]

    lines.append(mastery.split("---")[0].strip())
    lines.append("")
    lines.append("---")
    lines.append("")

    # Extract weekly section
    weekly_body = weekly.split("## At a Glance")[1].split("---")[0].strip() if "## At a Glance" in weekly else weekly
    lines.append("## Weekly Summary")
    lines.append("")
    lines.append(weekly_body)
    lines.append("")

    if plan.get("plan"):
        p = plan["plan"]
        lines += [
            "## Recommended Next Step",
            f"- **Topic:** {p['pdf_name']}",
            f"- **Current Mastery:** {round(p['mastery'])}%",
            f"- **Target:** {p['target']}%",
            f"- **Risk Level:** {p['risk'].upper()}",
            f"- **Recommended Action:** {p['recommended_actions'][0].capitalize() if p.get('recommended_actions') else 'Study'}",
            "",
        ]

    lines.append("---")
    lines.append("*Generated by NoteSmith — AI Study Companion*")

    return "\n".join(lines)
