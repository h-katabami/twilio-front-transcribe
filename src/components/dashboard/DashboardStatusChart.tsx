import {
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    Legend,
    LinearScale,
    Tooltip,
    type ChartOptions,
} from "chart.js";
import { Bar } from "react-chartjs-2";

type DashboardStatusChartProps = {
  columns: string[];
  statusList: string[];
  countsByStatus: Record<string, number[]>;
  period: "today" | "yesterday" | "last7days" | "custom";
};

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const CHART_COLORS = [
  "#dde4e4",
  "#bff0f3",
  "#a0e8ee",
  "#2bccd8",
  "#8fb4b6",
  "#2bd87c",
  "#6be4a3",
  "#d8d32b",
  "#95e6ec",
  "#f7d6bf",
  "#f2b8b5",
  "#d4c7f4",
];

function formatColumnLabel(column: string, period: DashboardStatusChartProps["period"]): string {
  return period === "last7days" || period === "custom" ? column.slice(5) : `${column}:00`;
}

export function DashboardStatusChart(props: DashboardStatusChartProps) {
  const labels = props.columns.map((column) => formatColumnLabel(column, props.period));

  const datasets = props.statusList.map((status, index) => ({
    label: status,
    data: props.countsByStatus[status] ?? props.columns.map(() => 0),
    backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
    borderColor: "#d5d8d8",
    borderWidth: 1,
    borderRadius: 2,
    borderSkipped: false as const,
    maxBarThickness: 26,
  }));

  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          boxWidth: 10,
          boxHeight: 10,
          usePointStyle: true,
          pointStyle: "rectRounded",
          font: {
            size: 11,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => `${context.dataset.label}: ${context.parsed.y}件`,
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: {
          display: false,
        },
      },
      y: {
        stacked: true,
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
      },
    },
  };

  if (props.columns.length === 0 || props.statusList.length === 0) {
    return (
      <section className="dashboard-chart-section" aria-label="着信状況グラフ">
        <h3>着信状況</h3>
        <p>グラフ表示用のデータがありません。</p>
      </section>
    );
  }

  return (
    <section className="dashboard-chart-section" aria-label="着信状況グラフ">
      <h3>着信状況</h3>
      <div className="dashboard-chart-canvas">
        <Bar
          data={{
            labels,
            datasets,
          }}
          options={options}
        />
      </div>
    </section>
  );
}
