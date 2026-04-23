import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

const commonOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: "#edf7ff" } },
    tooltip: {
      backgroundColor: "#0d1a28",
      borderColor: "#26384a",
      borderWidth: 1,
      titleColor: "#edf7ff",
      bodyColor: "#edf7ff"
    }
  },
  scales: {
    x: { ticks: { color: "#8797aa" }, grid: { color: "rgba(38, 56, 74, 0.32)" } },
    y: { ticks: { color: "#8797aa" }, grid: { color: "rgba(38, 56, 74, 0.32)" } }
  }
};

export function AreaTrendChart({ points }) {
  return (
    <div className="chart-host">
      <Line
        data={{
          labels: points.map((point) => point.day),
          datasets: [
            {
              label: "Risk score",
              data: points.map((point) => point.score),
              borderColor: "#39d98a",
              backgroundColor: "rgba(57, 217, 138, 0.2)",
              fill: true,
              tension: 0.35
            }
          ]
        }}
        options={{
          ...commonOptions,
          plugins: { ...commonOptions.plugins, legend: { display: false } },
          scales: { ...commonOptions.scales, y: { ...commonOptions.scales.y, min: 0, max: 100 } }
        }}
      />
    </div>
  );
}

export function ActivityBarChart({ points, color = "#52a7ff" }) {
  return (
    <div className="chart-host">
      <Bar
        data={{
          labels: points.map((point) => point.name),
          datasets: [{ label: "Events", data: points.map((point) => point.value), backgroundColor: color, borderRadius: 6 }]
        }}
        options={{ ...commonOptions, plugins: { ...commonOptions.plugins, legend: { display: false } } }}
      />
    </div>
  );
}

export function ActivityDoughnutChart({ points }) {
  return (
    <div className="chart-host">
      <Doughnut
        data={{
          labels: points.map((point) => point.name),
          datasets: [
            {
              data: points.map((point) => point.value),
              backgroundColor: ["#39d98a", "#ff5c7a", "#52a7ff", "#f8b84e", "#b78cff"],
              borderWidth: 0
            }
          ]
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          cutout: "62%",
          plugins: commonOptions.plugins
        }}
      />
    </div>
  );
}
