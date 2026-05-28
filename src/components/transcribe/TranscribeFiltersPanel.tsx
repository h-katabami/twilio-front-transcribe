type LogFilters = {
  startDate: string;
  endDate: string;
};

type TranscribeFiltersPanelProps = {
  companyName: string;
  companySuggestions: string[];
  filters: LogFilters;
  onCompanyNameChange: (nextCompanyName: string) => void;
  onFiltersChange: (nextFilters: LogFilters) => void;
  onSearch: () => void;
  isSearching: boolean;
};

export function TranscribeFiltersPanel(props: TranscribeFiltersPanelProps) {
  const companySuggestions = Array.from(new Set(props.companySuggestions));
  const companyListId = "company-suggestions";

  return (
    <>
      <h2>通話ログ検索</h2>
      <section className="filters" aria-label="通話ログ検索条件">
        <div className="filter-block">
          <label>
            会社名
            <input
              type="text"
              value={props.companyName}
              list={companyListId}
              placeholder="会社名を入力または候補から選択"
              onChange={(event) => props.onCompanyNameChange(event.target.value)}
            />
          </label>
          <datalist id={companyListId}>
            {companySuggestions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>

          <div className="filter-date-grid">
            <label>
              開始日
              <input
                type="date"
                value={props.filters.startDate}
                onChange={(event) =>
                  props.onFiltersChange({
                    ...props.filters,
                    startDate: event.target.value,
                  })
                }
              />
            </label>

            <label>
              終了日
              <input
                type="date"
                value={props.filters.endDate}
                onChange={(event) =>
                  props.onFiltersChange({
                    ...props.filters,
                    endDate: event.target.value,
                  })
                }
              />
            </label>
          </div>

          <button className="search-button" type="button" onClick={props.onSearch} disabled={props.isSearching}>
            {props.isSearching ? "検索中..." : "検索"}
          </button>
        </div>
      </section>
    </>
  );
}
