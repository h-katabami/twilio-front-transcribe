import { useState } from "react";
import { DashboardStatusChart } from "../components/dashboard/DashboardStatusChart";
import { QueryErrorNotice } from "../components/ui/QueryErrorNotice";
import { useDashboardData } from "../hooks/dashboard/useDashboardData";

export function DashboardPage() {
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");
  const {
    company,
    setCompany,
    period,
    setPeriod,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    canApplyCustomRange,
    applyCustomRange,
    dateRange,
    companies,
    companiesQuery,
    statusCheckpointsQuery,
    logsQuery,
    aggregation,
  } = useDashboardData();

  const hasStatusData = aggregation.statusList.length > 0;
  const isInitialStatusLoading = (statusCheckpointsQuery.isLoading || logsQuery.isLoading) && !hasStatusData;
  const isStatusRefreshing = !isInitialStatusLoading
    && (statusCheckpointsQuery.isFetching || logsQuery.isFetching);

  return (
    <>
      <QueryErrorNotice errors={[companiesQuery.error, statusCheckpointsQuery.error, logsQuery.error]} />

      <section className="panel dashboard-placeholder" aria-label="ダッシュボード">
        <h2>ダッシュボード</h2>

        <div className="dashboard-filter-row">
          <label>
            会社
            <select value={company} onChange={(event) => setCompany(event.target.value)}>
              {companies.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </label>

          <label>
            期間
            <select value={period} onChange={(event) => setPeriod(event.target.value as "today" | "yesterday" | "last7days" | "custom") }>
              <option value="today">今日</option>
              <option value="yesterday">昨日</option>
              <option value="last7days">直近7日間</option>
              <option value="custom">期間指定</option>
            </select>
          </label>

          {period === "custom" ? (
            <div className="dashboard-custom-range">
              <label>
                開始日
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(event) => setCustomStartDate(event.target.value)}
                />
              </label>
              <label>
                終了日
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(event) => setCustomEndDate(event.target.value)}
                />
              </label>
              <button
                type="button"
                className="dashboard-search-button"
                onClick={applyCustomRange}
                disabled={!canApplyCustomRange || logsQuery.isFetching}
              >
                検索
              </button>
            </div>
          ) : null}
        </div>

        <section className="dashboard-summary" aria-label="集計サマリー">
          <p>対象期間: {dateRange.startDate} 〜 {dateRange.endDate}</p>
          <p>総着信数: {aggregation.totalCalls}件</p>
        </section>

        <section className="dashboard-status-section" aria-label="ステータス別件数">
          <h3>ステータス別件数</h3>
          {isInitialStatusLoading ? (
            <p>データを取得中です...</p>
          ) : hasStatusData ? (
            <ul className="dashboard-status-list">
              {aggregation.statusList.map((status) => (
                <li key={status}>{status}: {aggregation.statusTotals[status] ?? 0}件</li>
              ))}
            </ul>
          ) : (
            <p>ステータスデータがありません。</p>
          )}
          <p className="dashboard-status-feedback" aria-live="polite">
            {isStatusRefreshing ? "集計を更新中..." : "\u00a0"}
          </p>
        </section>

        <section className="dashboard-view-switch" aria-label="着信状況表示切替">
          <button
            type="button"
            className={viewMode === "chart" ? "is-active" : ""}
            onClick={() => setViewMode("chart")}
          >
            チャート
          </button>
          <button
            type="button"
            className={viewMode === "table" ? "is-active" : ""}
            onClick={() => setViewMode("table")}
          >
            集計
          </button>
        </section>

        {viewMode === "chart" ? (
          <DashboardStatusChart
            columns={aggregation.columns}
            statusList={aggregation.statusList}
            countsByStatus={aggregation.countsByStatus}
            period={period}
          />
        ) : (
          <section className="dashboard-grid-section" aria-label="時間帯別集計">
            <h3>集計テーブル</h3>
            <div className="dashboard-grid-scroll">
              <table className="dashboard-grid-table">
                <colgroup>
                  <col className="dashboard-grid-table-status-col" />
                  {aggregation.columns.map((column) => (
                    <col key={column} className="dashboard-grid-table-bucket-col" />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    <th>ステータス</th>
                    {aggregation.columns.map((column) => (
                      <th key={column}>{period === "last7days" || period === "custom" ? column.slice(5) : `${column}:00`}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>全件</td>
                    {aggregation.columns.map((column, index) => (
                      <td key={`all-${column}`}>{aggregation.countsByStatus.all[index] ?? 0}</td>
                    ))}
                  </tr>
                  {aggregation.statusList.map((status) => (
                    <tr key={status}>
                      <td>{status}</td>
                      {aggregation.columns.map((column, index) => (
                        <td key={`${status}-${column}`}>{aggregation.countsByStatus[status]?.[index] ?? 0}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </section>
    </>
  );
}
