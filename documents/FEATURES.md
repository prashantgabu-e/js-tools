# Features

This list is based only on code present in the repository. Where the app depends on behavior outside the repo, that dependency is called out explicitly.

## App Shell And Navigation

### Hash-based multi-tool shell

- What it does: renders a shared sidebar/topbar shell and switches between the SMS analyzer, finance form, and bulk finance form based on the URL hash.
- Entry point: [src/App.tsx](/E:/Learnings/Projects/js-tools/src/App.tsx:31), with view parsing in [src/App.tsx](/E:/Learnings/Projects/js-tools/src/App.tsx:11).
- Edge cases handled: if the hash is empty or just `#`, `ensureDefaultHash` redirects the user to `#/sms-analyzer`; unknown hashes also fall back to the SMS analyzer because `getViewFromHash` defaults to that view.

### Static-host friendly routing bootstrap

- What it does: mounts the React app inside `HashRouter` and registers AG Grid modules needed by the SMS table.
- Entry point: [src/main.tsx](/E:/Learnings/Projects/js-tools/src/main.tsx:1).
- Edge cases handled: the hash router avoids server-side route handling requirements on static hosts; AG Grid community modules are registered once at startup.

### Responsive sidebar navigation

- What it does: shows navigation links for the three tool views and exposes a mobile menu toggle.
- Entry point: [src/components/Sidebar.tsx](/E:/Learnings/Projects/js-tools/src/components/Sidebar.tsx:12), [src/components/Topbar.tsx](/E:/Learnings/Projects/js-tools/src/components/Topbar.tsx:9).
- Edge cases handled: the sidebar can be opened and closed on smaller screens through `isSidebarOpen`; clicking a nav link triggers `onNavigate` to close the mobile panel.

## SMS Analyzer

### XML file upload and drag-and-drop intake

- What it does: accepts one XML file through either the file picker or drag-and-drop and loads its contents for analysis.
- Entry point: `SmsAnalyzerPage` in [src/pages/SmsAnalyzerPage.tsx](/E:/Learnings/Projects/js-tools/src/pages/SmsAnalyzerPage.tsx:68), file handler in [src/pages/SmsAnalyzerPage.tsx](/E:/Learnings/Projects/js-tools/src/pages/SmsAnalyzerPage.tsx:273).
- Edge cases handled: non-XML filenames are rejected; empty files raise an error; drag-over state is reset on drop and drag-end.

### XML parsing into enriched SMS records

- What it does: parses `<sms>` elements from the uploaded XML and converts them into normalized `SmsRow` objects with derived metadata.
- Entry point: [src/utils/sms.ts](/E:/Learnings/Projects/js-tools/src/utils/sms.ts:189) and [src/utils/sms.ts](/E:/Learnings/Projects/js-tools/src/utils/sms.ts:164).
- Edge cases handled: invalid XML throws `"Invalid XML file."`; files without `<sms>` entries throw a dedicated error; invalid timestamps fall back to the original value in `formatDate`.

### Amount extraction and currency normalization

- What it does: attempts to extract transaction amounts from SMS bodies and converts USD values to INR using a fixed rate.
- Entry point: `extractAmount`, `detectCurrency`, and `parseSmsNode` in [src/utils/sms.ts](/E:/Learnings/Projects/js-tools/src/utils/sms.ts:33), [src/utils/sms.ts](/E:/Learnings/Projects/js-tools/src/utils/sms.ts:45), and [src/utils/sms.ts](/E:/Learnings/Projects/js-tools/src/utils/sms.ts:164).
- Edge cases handled: missing or unparsable amounts become `null`; the UI marks converted values with `"Converted from USD"`; the exchange rate is a constant in [src/constants.ts](/E:/Learnings/Projects/js-tools/src/constants.ts:7), not a live lookup.

### Transaction classification and enrichment

- What it does: classifies each message as transaction/non-transaction, labels it as `Debit`, `Credit`, or `Other`, infers bank name, identifies known vendors, and assigns a vendor category.
- Entry point: [src/utils/sms.ts](/E:/Learnings/Projects/js-tools/src/utils/sms.ts:49), [src/utils/sms.ts](/E:/Learnings/Projects/js-tools/src/utils/sms.ts:55), [src/utils/sms.ts](/E:/Learnings/Projects/js-tools/src/utils/sms.ts:79), [src/utils/sms.ts](/E:/Learnings/Projects/js-tools/src/utils/sms.ts:102), [src/utils/sms.ts](/E:/Learnings/Projects/js-tools/src/utils/sms.ts:147).
- Edge cases handled: certain phrases explicitly override false debit/credit matches back to `Other`; unmatched banks and vendors fall back to `"Unknown"`; recurring payment and fund-transfer vendor names are extracted from specific text patterns when no direct vendor match exists.

### Summary cards and lightweight charts

- What it does: computes visible-message counts, debit/credit counts, total visible amount, a recent timeline, and top category/bank distributions.
- Entry point: `visibleSummary` state derivation plus `getTimelineData` and `renderBarRows` in [src/pages/SmsAnalyzerPage.tsx](/E:/Learnings/Projects/js-tools/src/pages/SmsAnalyzerPage.tsx:26) and [src/pages/SmsAnalyzerPage.tsx](/E:/Learnings/Projects/js-tools/src/pages/SmsAnalyzerPage.tsx:45).
- Edge cases handled: invalid dates are ignored for timeline bucketing; empty chart datasets render a `"No data available."` message; the timeline only keeps the last eight bucket entries after reduction.

### Grid-based filtering, sorting, and pagination

- What it does: renders parsed SMS rows in AG Grid with quick search, external filters, sortable columns, floating filters, and pagination.
- Entry point: grid configuration in [src/pages/SmsAnalyzerPage.tsx](/E:/Learnings/Projects/js-tools/src/pages/SmsAnalyzerPage.tsx:68), external filter hooks in [src/pages/SmsAnalyzerPage.tsx](/E:/Learnings/Projects/js-tools/src/pages/SmsAnalyzerPage.tsx:543).
- Edge cases handled: filtering combines free-text search with transaction/bank/category/sender filters; visible row state is recomputed after filtering, sorting, first render, and row updates so the dashboard stays aligned with the table view.

### CSV export of the current result set

- What it does: exports the currently filtered and sorted SMS rows as a CSV file with a timestamped filename.
- Entry point: [src/pages/SmsAnalyzerPage.tsx](/E:/Learnings/Projects/js-tools/src/pages/SmsAnalyzerPage.tsx:313).
- Edge cases handled: export is disabled when there are no visible rows; the export only includes selected columns and stringifies empty values as blank strings.

## Finance Entry

### Single transaction form

- What it does: captures date, time, amount, category, description, payment mode, and transaction type for one finance record.
- Entry point: [src/pages/FinancePage.tsx](/E:/Learnings/Projects/js-tools/src/pages/FinancePage.tsx:25), initial state in [src/pages/FinancePage.tsx](/E:/Learnings/Projects/js-tools/src/pages/FinancePage.tsx:12).
- Edge cases handled: the form initializes date/time from the local browser clock; after a successful save it resets back to a fresh initial state; amount is stored separately as a string so the UI can preserve empty input state until submission.

### Preset shortcut buttons

- What it does: fills common finance combinations such as `Food`, `Altroz CNG/Petrol`, and `Guests/Friends`, leaving only the amount for the user to enter.
- Entry point: shortcut data in [src/constants.ts](/E:/Learnings/Projects/js-tools/src/constants.ts:42), application logic in [src/pages/FinancePage.tsx](/E:/Learnings/Projects/js-tools/src/pages/FinancePage.tsx:44).
- Edge cases handled: if an unknown shortcut label is requested, nothing happens; applying a shortcut resets the rest of the form to fresh defaults and clears any previous amount.

### Client-side validation for single saves

- What it does: validates the required finance payload fields before attempting submission.
- Entry point: [src/utils/finance.ts](/E:/Learnings/Projects/js-tools/src/utils/finance.ts:60), used by [src/pages/FinancePage.tsx](/E:/Learnings/Projects/js-tools/src/pages/FinancePage.tsx:66).
- Edge cases handled: missing date, missing transaction type, missing category, and non-positive or non-finite amounts each produce explicit errors shown back in the page feedback area.

### Form-post submission to external Apps Script

- What it does: posts the validated transaction to an external Google Apps Script endpoint by dynamically creating a hidden HTML form targeted at a hidden iframe.
- Entry point: [src/utils/finance.ts](/E:/Learnings/Projects/js-tools/src/utils/finance.ts:4).
- Edge cases handled: if the API URL is missing or still contains a placeholder token, submission is rejected immediately; the promise times out after `45,000` ms if no confirmation is received; only `message` events with `source === "finance-apps-script"` are accepted; JSON-string message payloads are parsed when possible.

## Bulk Finance Entry

### Multi-row transaction table

- What it does: lets the user add, edit, and remove multiple finance rows before submitting them together.
- Entry point: [src/pages/BulkFinancePage.tsx](/E:/Learnings/Projects/js-tools/src/pages/BulkFinancePage.tsx:35), row factory in [src/pages/BulkFinancePage.tsx](/E:/Learnings/Projects/js-tools/src/pages/BulkFinancePage.tsx:22).
- Edge cases handled: new rows are seeded with current local date/time defaults and a generated `crypto.randomUUID()` id; removing a row also clears previous feedback text.

### Bulk payload construction and row-level validation

- What it does: converts editable row state into a `transactions` array payload and validates each row before submission.
- Entry point: [src/pages/BulkFinancePage.tsx](/E:/Learnings/Projects/js-tools/src/pages/BulkFinancePage.tsx:56).
- Edge cases handled: the page rejects empty row sets; each row must include date, transaction type, category, and an amount greater than `0`; validation errors identify the exact failing row number.

### Bulk save through the same Apps Script channel

- What it does: submits all validated rows in one request using `operation: "bulk-add"` plus a JSON-stringified `transactions` field.
- Entry point: submit handler in [src/pages/BulkFinancePage.tsx](/E:/Learnings/Projects/js-tools/src/pages/BulkFinancePage.tsx:82), transport in [src/utils/finance.ts](/E:/Learnings/Projects/js-tools/src/utils/finance.ts:4).
- Edge cases handled: successful saves reset the page back to a single fresh row; the success message pluralizes correctly based on the number of rows saved; failures reuse the same external confirmation and timeout logic as the single-entry page.

## Shared Configuration And Utilities

### Route, copy, and option catalogs

- What it does: centralizes route hashes, page labels, finance shortcuts, category options, payment options, and transaction-type options.
- Entry point: [src/constants.ts](/E:/Learnings/Projects/js-tools/src/constants.ts:9).
- Edge cases handled: route hashes and page copy stay aligned through shared `AppView` keys; option lists constrain what the finance forms render rather than accepting arbitrary free-form values for those fields.

### Local date and time formatting helpers

- What it does: produces `YYYY-MM-DD` and `HH:mm` strings used as default values in finance entry pages.
- Entry point: [src/utils/date.ts](/E:/Learnings/Projects/js-tools/src/utils/date.ts:1).
- Edge cases handled: helpers default to `new Date()` when no argument is passed, so pages can create fresh rows or forms without manually supplying timestamps.
