import { useEffect, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, GridApi, GridReadyEvent, ICellRendererParams, IRowNode } from "ag-grid-community";
import { Download, Search, Upload } from "lucide-react";
import { getCategoryClassName, getCounts, parseXmlContent } from "../utils/sms";
import type { SmsCategory, SmsRow } from "../types";

interface FilterState {
  search: string;
  type: "all" | "transaction" | "non-transaction";
  bank: string;
  category: "all" | SmsCategory;
  sender: string;
  sort: "date-desc" | "date-asc" | "amount-desc" | "amount-asc" | "sender-asc";
}

const initialFilters: FilterState = {
  search: "",
  type: "all",
  bank: "all",
  category: "all",
  sender: "all",
  sort: "date-desc"
};

function getTimelineData(rows: SmsRow[]) {
  const buckets = rows.reduce<Record<string, number>>((acc, row) => {
    const date = new Date(Number(row.date));
    if (Number.isNaN(date.getTime())) {
      return acc;
    }

    const label = new Intl.DateTimeFormat("en-IN", {
      month: "short",
      year: "2-digit"
    }).format(date);

    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(buckets).slice(-8);
}

function renderBarRows(counts: Record<string, number>) {
  const entries = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  if (!entries.length) {
    return <div className="empty-chart">No data available.</div>;
  }

  const max = entries[0][1];
  return entries.map(([label, value]) => (
    <div className="bar-row" key={label}>
      <div className="bar-row__label">
        <span>{label}</span>
        <span>{value.toLocaleString("en-IN")}</span>
      </div>
      <div className="bar-track">
        <span style={{ width: `${(value / max) * 100}%` }} />
      </div>
    </div>
  ));
}

export function SmsAnalyzerPage() {
  const [smsRows, setSmsRows] = useState<SmsRow[]>([]);
  const [visibleRows, setVisibleRows] = useState<SmsRow[]>([]);
  const [fileStatus, setFileStatus] = useState("No file selected yet.");
  const [tableMeta, setTableMeta] = useState("Upload an XML file to see parsed SMS records.");
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const gridApiRef = useRef<GridApi<SmsRow> | null>(null);
  const filtersRef = useRef<FilterState>(initialFilters);

  const senderOptions = useMemo(
    () => Array.from(new Set(smsRows.map((row) => row.address))).sort((a, b) => a.localeCompare(b)),
    [smsRows]
  );
  const bankOptions = useMemo(
    () => Array.from(new Set(smsRows.map((row) => row.bank))).sort((a, b) => a.localeCompare(b)),
    [smsRows]
  );

  const columnDefs = useMemo<ColDef<SmsRow>[]>(
    () => [
      {
        headerName: "Date",
        field: "readableDate",
        minWidth: 190,
        sort: "desc",
        comparator: (_, __, nodeA, nodeB) => Number(nodeA.data?.date || 0) - Number(nodeB.data?.date || 0)
      },
      {
        headerName: "Bank",
        field: "bank",
        minWidth: 140,
        cellRenderer: (params: ICellRendererParams<SmsRow, string>) => (
          <span className="bank-name">{params.value || "Unknown"}</span>
        )
      },
      {
        headerName: "SMS Category",
        field: "category",
        minWidth: 160,
        cellRenderer: (params: ICellRendererParams<SmsRow, SmsCategory>) => (
          <span className={`category-text ${getCategoryClassName(params.value || "Other")}`}>
            {params.value || "Other"}
          </span>
        )
      },
      { headerName: "Vendor", field: "vendor", minWidth: 180 },
      { headerName: "Vendor Category", field: "vendorCategory", minWidth: 180 },
      {
        headerName: "Amount (INR)",
        field: "amount",
        minWidth: 150,
        type: "numericColumn",
        valueFormatter: (params) =>
          params.value !== null && params.value !== undefined && params.value !== ""
            ? `Rs ${Number(params.value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
            : "-",
        cellRenderer: (params: ICellRendererParams<SmsRow, number | null>) => {
          if (params.value === null || params.value === undefined) {
            return "-";
          }

          return (
            <span className="amount">
              {`Rs ${Number(params.value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`}
              {params.data?.currency === "USD" ? <small>Converted from USD</small> : null}
            </span>
          );
        }
      },
      {
        headerName: "Message",
        field: "body",
        minWidth: 420,
        flex: 1,
        wrapText: true,
        cellStyle: { whiteSpace: "normal" },
        cellRenderer: (params: ICellRendererParams<SmsRow, string>) => (
          <span className="message-cell">{params.value || ""}</span>
        )
      },
      {
        headerName: "Sender",
        field: "address",
        minWidth: 180,
        cellRenderer: (params: ICellRendererParams<SmsRow, string>) => (
          <>
            <span className="sender">{params.value || "Unknown"}</span>
            <br />
            <small>{params.data?.smsType || ""}</small>
          </>
        )
      }
    ],
    []
  );

  const visibleSummary = useMemo(() => {
    const debitRows = visibleRows.filter((row) => row.category === "Debit");
    const creditRows = visibleRows.filter((row) => row.category === "Credit");
    const amountSum = visibleRows.reduce((sum, row) => sum + (row.amount || 0), 0);
    return {
      totalMessages: visibleRows.length,
      transactionMessages: debitRows.length,
      creditMessages: creditRows.length,
      totalAmount: amountSum
    };
  }, [visibleRows]);

  const timelineEntries = useMemo(() => getTimelineData(visibleRows), [visibleRows]);
  const timelinePath = useMemo(() => {
    if (!timelineEntries.length) {
      return { area: "", line: "" };
    }

    const values = timelineEntries.map(([, value]) => value);
    const max = Math.max(...values, 1);
    const width = 720;
    const height = 280;
    const left = 24;
    const right = width - 24;
    const top = 24;
    const bottom = height - 28;
    const step = timelineEntries.length > 1 ? (right - left) / (timelineEntries.length - 1) : 0;

    const points = timelineEntries.map(([, value], index) => {
      const x = left + step * index;
      const y = bottom - (value / max) * (bottom - top);
      return [x, y] as const;
    });

    const line = points.map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x} ${y}`).join(" ");
    const area = `${line} L ${points.at(-1)?.[0] ?? left} ${bottom} L ${points[0]?.[0] ?? left} ${bottom} Z`;
    return { area, line };
  }, [timelineEntries]);

  function syncVisibleRows() {
    const gridApi = gridApiRef.current;
    if (!gridApi) {
      return;
    }

    const nextRows: SmsRow[] = [];
    gridApi.forEachNodeAfterFilterAndSort((node: IRowNode<SmsRow>) => {
      if (node.data) {
        nextRows.push(node.data);
      }
    });

    setVisibleRows(nextRows);
    setTableMeta(nextRows.length ? `${nextRows.length.toLocaleString("en-IN")} records shown.` : "0 records shown.");
  }

  function applyFilters(nextFilters: FilterState) {
    const gridApi = gridApiRef.current;
    if (!gridApi) {
      return;
    }

    gridApi.setGridOption("quickFilterText", nextFilters.search.trim());
    gridApi.onFilterChanged();

    switch (nextFilters.sort) {
      case "date-asc":
        gridApi.applyColumnState({ state: [{ colId: "readableDate", sort: "asc" }], defaultState: { sort: null } });
        break;
      case "amount-desc":
        gridApi.applyColumnState({ state: [{ colId: "amount", sort: "desc" }], defaultState: { sort: null } });
        break;
      case "amount-asc":
        gridApi.applyColumnState({ state: [{ colId: "amount", sort: "asc" }], defaultState: { sort: null } });
        break;
      case "sender-asc":
        gridApi.applyColumnState({ state: [{ colId: "address", sort: "asc" }], defaultState: { sort: null } });
        break;
      case "date-desc":
      default:
        gridApi.applyColumnState({ state: [{ colId: "readableDate", sort: "desc" }], defaultState: { sort: null } });
        break;
    }
  }

  useEffect(() => {
    filtersRef.current = filters;
    applyFilters(filters);
    syncVisibleRows();
  }, [filters]);

  useEffect(() => {
    const gridApi = gridApiRef.current;
    if (!gridApi) {
      setVisibleRows(smsRows);
      setTableMeta(smsRows.length ? `${smsRows.length.toLocaleString("en-IN")} records shown.` : "0 records shown.");
      return;
    }

    applyFilters(filtersRef.current);
    syncVisibleRows();
  }, [smsRows]);

  function updateFilters<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  async function handleFile(file: File | undefined) {
    if (!file) {
      return;
    }

    const isXml = file.name.toLowerCase().endsWith(".xml");
    setFileStatus(isXml ? `Selected file: ${file.name}` : "Please select a valid XML file.");

    if (!isXml) {
      setSmsRows([]);
      setVisibleRows([]);
      setTableMeta("0 records shown.");
      return;
    }

    try {
      const xmlText = await file.text();
      if (!xmlText.trim()) {
        throw new Error("The selected XML file is empty.");
      }

      const rows = parseXmlContent(xmlText);
      setSmsRows(rows);
      setFileStatus(`Loaded ${file.name} successfully.`);
      setTableMeta(`${rows.length.toLocaleString("en-IN")} records shown.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to read the selected XML file.";
      setSmsRows([]);
      setVisibleRows([]);
      setTableMeta(message);
      setFileStatus(message);
    }
  }

  function onGridReady(event: GridReadyEvent<SmsRow>) {
    gridApiRef.current = event.api;
    applyFilters(filtersRef.current);
    syncVisibleRows();
  }

  function exportVisibleRowsToCsv() {
    const gridApi = gridApiRef.current;
    if (!gridApi || !visibleRows.length) {
      return;
    }

    const timestamp = new Date().toISOString().slice(0, 19).replaceAll(":", "-");
    gridApi.exportDataAsCsv({
      fileName: `sms-analyzer-export-${timestamp}.csv`,
      columnKeys: ["readableDate", "bank", "category", "vendor", "vendorCategory", "amount", "body", "address"],
      exportedRows: "filteredAndSorted",
      processCellCallback: (params) => String(params.value ?? "")
    });
  }

  return (
    <section className="page-view page-view--active">
      <section className="panel analyzer-upload-panel">
        <label
          className={`upload-zone${isDragOver ? " is-dragover" : ""}`}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragOver(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDragEnd={() => setIsDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragOver(false);
            void handleFile(event.dataTransfer.files[0]);
          }}
        >
          <input
            ref={fileInputRef}
            id="xmlFile"
            type="file"
            accept=".xml,text/xml,application/xml"
            hidden
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />
          <div className="upload-zone__icon">
            <Upload className="icon" aria-hidden="true" />
          </div>
          <div className="upload-copy">
            <h4>Select or drop your SMS export file</h4>
            <p>One XML file only.</p>
          </div>
          <button
            className="upload-zone__button"
            type="button"
            onClick={(event) => {
              event.preventDefault();
              fileInputRef.current?.click();
            }}
          >
            Choose XML File
          </button>
        </label>
      </section>

      <div className="file-status">{fileStatus}</div>

      <section className="stats-grid">
        <article className="stat-card">
          <p className="eyebrow">Visible Messages</p>
          <h3>{visibleSummary.totalMessages.toLocaleString("en-IN")}</h3>
          <span>Rows in current view</span>
        </article>
        <article className="stat-card">
          <p className="eyebrow">Debit SMS</p>
          <h3>{visibleSummary.transactionMessages.toLocaleString("en-IN")}</h3>
          <span>Debit messages</span>
        </article>
        <article className="stat-card">
          <p className="eyebrow">Credit SMS</p>
          <h3>{visibleSummary.creditMessages.toLocaleString("en-IN")}</h3>
          <span>Incoming credit messages</span>
        </article>
        <article className="stat-card">
          <p className="eyebrow">Amount Found</p>
          <h3>
            {visibleSummary.totalAmount
              ? `Rs ${visibleSummary.totalAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
              : "Rs 0"}
          </h3>
          <span>Visible parsed amounts</span>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="panel chart-panel">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Trend</p>
              <h3>Messages over time</h3>
            </div>
          </div>
          <div className="line-chart">
            <div className="line-chart__summary">
              {visibleRows.length
                ? `${visibleRows.length.toLocaleString("en-IN")} visible messages across ${timelineEntries.length} time buckets.`
                : "Upload an XML file to see timeline activity."}
            </div>
            <div className="line-chart__canvas">
              <svg viewBox="0 0 720 280" aria-label="Timeline chart" role="img">
                <path id="timelineArea" d={timelinePath.area} />
                <path id="timelineLine" d={timelinePath.line} />
              </svg>
              <div className="chart-axis">
                {timelineEntries.map(([label]) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
            </div>
          </div>
        </article>

        <article className="panel chart-panel">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Category Split</p>
              <h3>Debit, credit, other</h3>
            </div>
          </div>
          <div className="bars">{renderBarRows(getCounts(visibleRows, "category"))}</div>
        </article>

        <article className="panel chart-panel">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Bank Split</p>
              <h3>Top detected banks</h3>
            </div>
          </div>
          <div className="bars">{renderBarRows(getCounts(visibleRows, "bank"))}</div>
        </article>
      </section>

      <section className="panel results-panel">
        <div className="panel__header panel__header--stack">
          <div>
            <p className="eyebrow">Data Table</p>
            <h3>SMS records</h3>
          </div>

          <div className="toolbar">
            <label className="search-input">
              <Search className="icon" aria-hidden="true" />
              <input
                type="search"
                placeholder="Search sender, body, amount, date"
                value={filters.search}
                onChange={(event) => updateFilters("search", event.target.value)}
              />
            </label>

            <select value={filters.type} onChange={(event) => updateFilters("type", event.target.value as FilterState["type"])}>
              <option value="all">All messages</option>
              <option value="transaction">Transactions only</option>
              <option value="non-transaction">Non-transactions</option>
            </select>

            <select value={filters.bank} onChange={(event) => updateFilters("bank", event.target.value)}>
              <option value="all">All banks</option>
              {bankOptions.map((bank) => (
                <option key={bank} value={bank}>
                  {bank}
                </option>
              ))}
            </select>

            <select
              value={filters.category}
              onChange={(event) => updateFilters("category", event.target.value as FilterState["category"])}
            >
              <option value="all">All categories</option>
              <option value="Debit">Debit</option>
              <option value="Credit">Credit</option>
              <option value="Other">Other</option>
            </select>

            <select value={filters.sender} onChange={(event) => updateFilters("sender", event.target.value)}>
              <option value="all">All senders</option>
              {senderOptions.map((sender) => (
                <option key={sender} value={sender}>
                  {sender}
                </option>
              ))}
            </select>

            <select value={filters.sort} onChange={(event) => updateFilters("sort", event.target.value as FilterState["sort"])}>
              <option value="date-desc">Newest first</option>
              <option value="date-asc">Oldest first</option>
              <option value="amount-desc">Highest amount</option>
              <option value="amount-asc">Lowest amount</option>
              <option value="sender-asc">Sender A-Z</option>
            </select>

            <button className="export-btn" type="button" onClick={exportVisibleRowsToCsv} disabled={!visibleRows.length}>
              <Download className="icon" aria-hidden="true" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div className="table-meta">{tableMeta}</div>

        <div className="grid-shell">
          <div className="ag-theme-quartz sms-grid">
            <AgGridReact<SmsRow>
              theme="legacy"
              columnDefs={columnDefs}
              rowData={smsRows}
              rowHeight={74}
              defaultColDef={{
                sortable: true,
                filter: true,
                resizable: true,
                floatingFilter: true
              }}
              animateRows
              pagination
              paginationPageSize={25}
              paginationPageSizeSelector={[25, 50, 100, 500]}
              suppressCellFocus
              quickFilterText={filters.search.trim()}
              isExternalFilterPresent={() =>
                filtersRef.current.type !== "all" ||
                filtersRef.current.bank !== "all" ||
                filtersRef.current.category !== "all" ||
                filtersRef.current.sender !== "all"
              }
              doesExternalFilterPass={(node) => {
                const row = node.data;
                if (!row) {
                  return true;
                }

                const activeFilters = filtersRef.current;
                const matchesType =
                  activeFilters.type === "all" ||
                  (activeFilters.type === "transaction" && row.transaction) ||
                  (activeFilters.type === "non-transaction" && !row.transaction);
                const matchesBank = activeFilters.bank === "all" || row.bank === activeFilters.bank;
                const matchesCategory = activeFilters.category === "all" || row.category === activeFilters.category;
                const matchesSender = activeFilters.sender === "all" || row.address === activeFilters.sender;

                return matchesType && matchesBank && matchesCategory && matchesSender;
              }}
              onGridReady={onGridReady}
              onRowDataUpdated={syncVisibleRows}
              onFirstDataRendered={syncVisibleRows}
              onFilterChanged={syncVisibleRows}
              onSortChanged={syncVisibleRows}
              onModelUpdated={syncVisibleRows}
            />
          </div>
        </div>
      </section>
    </section>
  );
}
