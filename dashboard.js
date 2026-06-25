(() => {
  const data = window.PASS_FAIL_DATA || [];
  const dimensions = ["Academic Year", "Term", "Type of Students", "Level"];
  const filterMap = {
    "Academic Year": document.querySelector("#academicYearFilter"),
    "Term": document.querySelector("#termFilter"),
    "Type of Students": document.querySelector("#studentTypeFilter"),
    "Level": document.querySelector("#levelFilter")
  };

  const numberFormat = new Intl.NumberFormat("en-US");
  const percent = value => Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : "N/A";
  const unique = key => [...new Set(data.map(row => row[key]))];

  dimensions.forEach(key => {
    const select = filterMap[key];
    const allLabel = key === "Type of Students" ? "All Student Types" : `All ${key.toLowerCase()}s`;
    const values = unique(key).filter(value => key !== "Type of Students" || value !== "BOTH");
    select.innerHTML = `<option value="">${allLabel}</option>`;
    values.forEach(value => select.add(new Option(value, value)));
  });

  document.querySelector("#coverageLabel").textContent = "2021 - 2025";

  const controls = [
    ...Object.values(filterMap),
    document.querySelector("#dimensionSelect")
  ];

  controls.forEach(control => control.addEventListener("input", render));
  document.querySelector("#resetFilters").addEventListener("click", () => {
    Object.values(filterMap).forEach(select => { select.value = ""; });
    document.querySelector("#dimensionSelect").value = "Level";
    render();
  });

  function hasActiveFilters() {
    return dimensions.some(key => Boolean(filterMap[key].value));
  }

  function filteredRows() {
    return data.filter(row => dimensions.every(key => !filterMap[key].value || row[key] === filterMap[key].value));
  }

  function comparisonRows(dimension) {
    return data.filter(row => dimensions.every(key => {
      if (key === dimension) return true;
      return !filterMap[key].value || row[key] === filterMap[key].value;
    }));
  }

  function getSummary(rows) {
    // Prefer non-overlapping aggregate rows when present to prevent double-counting.
    let summaryRows = rows.filter(row => row["Type of Students"] === "BOTH" && row.Level === "ALL");
    if (!summaryRows.length) summaryRows = rows.filter(row => row["Type of Students"] === "BOTH" && row.Level !== "ALL");
    if (!summaryRows.length) summaryRows = rows.filter(row => row["Type of Students"] !== "BOTH" && row.Level === "ALL");
    if (!summaryRows.length) {
      const hasDetail = rows.some(row => row.Level !== "ALL");
      summaryRows = hasDetail ? rows.filter(row => row.Level !== "ALL" && row["Type of Students"] !== "BOTH") : rows;
    }
    const students = summaryRows.reduce((sum, row) => sum + (row["Number of Sts"] || 0), 0);
    const pass = summaryRows.reduce((sum, row) => sum + (row["Pass Sts"] || 0), 0);
    const fail = summaryRows.reduce((sum, row) => sum + (row["Fail Sts"] || 0), 0);
    return { students, pass, fail, rate: students ? pass / students : null };
  }

  function renderKpis(rows, summary) {
    if (!hasActiveFilters()) {
      document.querySelector("#totalStudents").textContent = "—";
      document.querySelector("#passStudents").textContent = "—";
      document.querySelector("#failStudents").textContent = "—";
      document.querySelector("#passRate").textContent = "—";
      document.querySelector("#recordCount").textContent = "Select a filter to calculate";
      document.querySelector("#passShare").textContent = "— of selected";
      document.querySelector("#failShare").textContent = "— of selected";
      return;
    }

    document.querySelector("#totalStudents").textContent = numberFormat.format(summary.students);
    document.querySelector("#passStudents").textContent = numberFormat.format(summary.pass);
    document.querySelector("#failStudents").textContent = numberFormat.format(summary.fail);
    document.querySelector("#passRate").textContent = percent(summary.rate);
    document.querySelector("#recordCount").textContent = `${rows.length} record${rows.length === 1 ? "" : "s"} selected`;
    document.querySelector("#passShare").textContent = `${percent(summary.rate)} of selected`;
    document.querySelector("#failShare").textContent = `${percent(summary.students ? summary.fail / summary.students : null)} of selected`;
  }

  function renderDonut(summary) {
    const rate = Number.isFinite(summary.rate) ? summary.rate : 0;
    document.querySelector("#donutChart").style.setProperty("--rate", `${rate * 360}deg`);
    document.querySelector("#donutRate").textContent = percent(summary.rate);
    document.querySelector("#legendPass").textContent = numberFormat.format(summary.pass);
    document.querySelector("#legendFail").textContent = numberFormat.format(summary.fail);
  }

  function renderBars() {
    const dimension = document.querySelector("#dimensionSelect").value;
    document.querySelector("#dimensionTitle").textContent = dimension.toLowerCase();
    const groups = new Map();
    const chartRows = comparisonRows(dimension);

    chartRows.filter(row => {
      if (dimension !== "Level" && row.Level === "ALL") return false;
      if (dimension !== "Type of Students" && row["Type of Students"] === "BOTH") return false;
      return true;
    }).forEach(row => {
      const key = row[dimension];
      const group = groups.get(key) || { pass: 0, total: 0 };
      group.pass += row["Pass Sts"] || 0;
      group.total += row["Number of Sts"] || 0;
      groups.set(key, group);
    });

    const entries = [...groups].filter(([, values]) => values.total > 0).map(([label, values]) => ({
      label,
      rate: values.total ? values.pass / values.total : 0
    })).sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));

    const chart = document.querySelector("#barChart");
    if (!entries.length) {
      chart.innerHTML = `<div class="chart-empty">No chart data for this selection.</div>`;
      return;
    }
    chart.innerHTML = entries.map(item => `
      <div class="bar-row">
        <span class="bar-label">${item.label}</span>
        <div class="bar-track"><i style="width:${Math.max(item.rate * 100, 1)}%"></i></div>
        <strong>${percent(item.rate)}</strong>
      </div>
    `).join("");
  }

  function renderTable(rows) {
    const body = document.querySelector("#dataTableBody");
    const empty = document.querySelector("#emptyState");
    document.querySelector("#tableCount").textContent = `${rows.length} row${rows.length === 1 ? "" : "s"}`;
    body.innerHTML = rows.map(row => `
      <tr>
        <td>${row["Academic Year"]}</td>
        <td>${row.Term}</td>
        <td><span class="type-tag ${row["Type of Students"] === "BOTH" ? "both" : ""}">${row["Type of Students"]}</span></td>
        <td>${row.Level}</td>
        <td class="numeric">${Number.isFinite(row["Number of Sts"]) ? numberFormat.format(row["Number of Sts"]) : "—"}</td>
        <td class="numeric">${Number.isFinite(row["Pass Sts"]) ? numberFormat.format(row["Pass Sts"]) : "—"}</td>
        <td class="numeric">${Number.isFinite(row["Fail Sts"]) ? numberFormat.format(row["Fail Sts"]) : "—"}</td>
        <td class="numeric"><span class="rate-chip">${percent(row["Pass Success Rate"])}</span></td>
      </tr>
    `).join("");
    empty.hidden = rows.length > 0;
    document.querySelector(".table-scroll").hidden = rows.length === 0;
  }

  function render() {
    const rows = filteredRows();
    const summary = getSummary(rows);
    renderKpis(rows, summary);
    renderDonut(summary);
    renderBars();
    renderTable(rows);
  }

  render();
})();
