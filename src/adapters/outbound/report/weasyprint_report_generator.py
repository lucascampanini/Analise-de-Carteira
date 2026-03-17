"""Adapter: WeasyPrintReportGenerator - gera relatorio PDF via Jinja2 + WeasyPrint."""

from __future__ import annotations

import base64
import io
import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)

TEMPLATES_DIR = Path(__file__).parent / "templates"


class WeasyPrintReportGenerator:
    """Gerador de relatorio PDF de analise de carteira.

    Usa Jinja2 para renderizar HTML e WeasyPrint para converter em PDF.
    Graficos matplotlib sao embarcados como base64 PNG.
    """

    def __init__(self, templates_dir: Path | None = None) -> None:
        self._templates_dir = templates_dir or TEMPLATES_DIR

    async def generate_pdf(self, analise_dto: object) -> bytes:
        """Gera o relatorio PDF da analise de carteira.

        Args:
            analise_dto: AnaliseCarteiraRelatorioDTO com todos os dados.

        Returns:
            Bytes do PDF gerado.
        """
        try:
            from jinja2 import Environment, FileSystemLoader
        except ImportError:
            raise RuntimeError("jinja2 nao instalado. Execute: pip install jinja2")

        try:
            import weasyprint
        except ImportError:
            raise RuntimeError("weasyprint nao instalado. Execute: pip install weasyprint")

        charts = self._generate_charts(analise_dto)

        env = Environment(
            loader=FileSystemLoader(str(self._templates_dir)),
            autoescape=True,
        )
        env.globals["zip"] = zip
        template = env.get_template("relatorio_carteira.html")
        html_content = template.render(dto=analise_dto, charts=charts)

        pdf_bytes = weasyprint.HTML(
            string=html_content,
            base_url=str(self._templates_dir),
        ).write_pdf()

        logger.info("Relatorio PDF gerado com sucesso")
        return pdf_bytes

    def _generate_charts(self, dto: object) -> dict[str, str]:
        """Gera graficos matplotlib como base64 PNG."""
        try:
            import matplotlib
            matplotlib.use("Agg")  # Backend sem GUI
            import matplotlib.pyplot as plt
            import matplotlib.patches as mpatches
        except ImportError:
            logger.warning("matplotlib nao instalado - relatorio sem graficos")
            return {}

        charts: dict[str, str] = {}
        analise = dto.analise  # type: ignore[attr-defined]

        if analise.alocacao_por_classe:
            charts["alocacao_classe"] = self._pie_chart(
                data=analise.alocacao_por_classe,
                title="Alocacao por Classe de Ativo",
            )

        if analise.alocacao_por_setor:
            charts["alocacao_setor"] = self._bar_chart_horizontal(
                data=analise.alocacao_por_setor,
                title="Alocacao por Setor",
            )

        if analise.score_aderencia is not None:
            charts["score_gauge"] = self._gauge_chart(
                value=analise.score_aderencia,
                title="Score de Aderencia ao Perfil",
            )

        return charts

    def _pie_chart(self, data: dict[str, float], title: str) -> str:
        """Gera grafico de pizza como base64 PNG."""
        import matplotlib.pyplot as plt

        fig, ax = plt.subplots(figsize=(6, 4), facecolor="white")
        labels = list(data.keys())
        values = list(data.values())

        colors = [
            "#2196F3", "#4CAF50", "#FF9800", "#9C27B0",
            "#F44336", "#00BCD4", "#8BC34A", "#FF5722",
        ]

        wedges, texts, autotexts = ax.pie(
            values,
            labels=None,
            autopct="%1.1f%%",
            colors=colors[: len(values)],
            startangle=90,
            pctdistance=0.8,
        )
        for autotext in autotexts:
            autotext.set_fontsize(8)
            autotext.set_color("white")
            autotext.set_fontweight("bold")

        ax.legend(
            wedges,
            [f"{l} ({v:.1f}%)" for l, v in zip(labels, values)],
            loc="lower center",
            bbox_to_anchor=(0.5, -0.25),
            ncol=2,
            fontsize=8,
        )
        ax.set_title(title, fontsize=11, fontweight="bold", pad=10)
        plt.tight_layout()

        return self._fig_to_base64(fig)

    def _bar_chart_horizontal(
        self, data: dict[str, float], title: str
    ) -> str:
        """Gera grafico de barras horizontais como base64 PNG."""
        import matplotlib.pyplot as plt

        sorted_data = sorted(data.items(), key=lambda x: x[1], reverse=True)[:8]
        labels = [item[0] for item in sorted_data]
        values = [item[1] for item in sorted_data]

        fig, ax = plt.subplots(figsize=(7, max(3, len(labels) * 0.5 + 1)), facecolor="white")
        bars = ax.barh(labels, values, color="#2196F3", alpha=0.8)

        for bar, val in zip(bars, values):
            ax.text(
                val + 0.3,
                bar.get_y() + bar.get_height() / 2,
                f"{val:.1f}%",
                va="center",
                fontsize=8,
            )

        ax.set_xlabel("Percentual (%)", fontsize=9)
        ax.set_title(title, fontsize=11, fontweight="bold")
        ax.set_xlim(0, max(values) * 1.2)
        ax.invert_yaxis()
        plt.tight_layout()

        return self._fig_to_base64(fig)

    def _gauge_chart(self, value: float, title: str) -> str:
        """Gera grafico gauge para o score de aderencia."""
        import matplotlib.pyplot as plt
        import numpy as np

        fig, ax = plt.subplots(figsize=(5, 3.5), facecolor="white")
        ax.set_aspect("equal")
        ax.axis("off")

        theta = np.linspace(np.pi, 0, 100)
        r_outer, r_inner = 1.0, 0.6

        zones = [
            (np.linspace(np.pi, np.pi * 0.7, 30), "#F44336"),
            (np.linspace(np.pi * 0.7, np.pi * 0.4, 30), "#FF9800"),
            (np.linspace(np.pi * 0.4, np.pi * 0.14, 30), "#FFEB3B"),
            (np.linspace(np.pi * 0.14, 0, 30), "#4CAF50"),
        ]

        for thetas, color in zones:
            x_outer = r_outer * np.cos(thetas)
            y_outer = r_outer * np.sin(thetas)
            x_inner = r_inner * np.cos(thetas[::-1])
            y_inner = r_inner * np.sin(thetas[::-1])
            ax.fill(
                np.concatenate([x_outer, x_inner]),
                np.concatenate([y_outer, y_inner]),
                color=color,
                alpha=0.9,
            )

        angle = np.pi * (1 - value / 100)
        ax.annotate(
            "",
            xy=(0.75 * np.cos(angle), 0.75 * np.sin(angle)),
            xytext=(0, 0),
            arrowprops=dict(arrowstyle="->", color="black", lw=2),
        )
        ax.plot(0, 0, "ko", markersize=8)

        ax.text(
            0, -0.2,
            f"{value:.0f}",
            ha="center",
            va="center",
            fontsize=22,
            fontweight="bold",
            color="black",
        )
        ax.text(0, -0.42, title, ha="center", fontsize=9, color="gray")

        ax.set_xlim(-1.1, 1.1)
        ax.set_ylim(-0.6, 1.1)
        plt.tight_layout()

        return self._fig_to_base64(fig)

    @staticmethod
    def _fig_to_base64(fig) -> str:
        """Converte figura matplotlib para string base64 PNG."""
        import matplotlib.pyplot as plt

        buf = io.BytesIO()
        fig.savefig(buf, format="png", bbox_inches="tight", dpi=100)
        buf.seek(0)
        encoded = base64.b64encode(buf.read()).decode("utf-8")
        plt.close(fig)
        return encoded
