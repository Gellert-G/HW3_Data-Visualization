(function () {
  "use strict";

  const DATA_FILE = "data/zaatari-refugee-camp-population.csv";
  const shelterData = [
    { type: "Caravans", value: 79.68, color: "#2f7d5c" },
    { type: "Combination", value: 10.81, color: "#386a91" },
    { type: "Tent", value: 9.51, color: "#d35d4b" }
  ];

  function parseRow(row) {
    const parseDate = d3.timeParse("%Y-%m-%d");
    return {
      date: parseDate(row.date) || new Date(row.date),
      population: +row.population
    };
  }

  async function loadData() {
    const embedded = document.querySelector("#zaatari-csv");
    const data = embedded
      ? d3.csvParse(embedded.textContent.trim(), parseRow)
      : await d3.csv(DATA_FILE, parseRow);
    return data.filter(d => d.date instanceof Date && !Number.isNaN(+d.date) && Number.isFinite(d.population))
      .sort((a, b) => d3.ascending(a.date, b.date));
  }

  function showError(message) {
    d3.select("#app").append("div")
      .attr("class", "error")
      .text(message);
  }

  function renderShelters() {
    d3.select(".shelter-strip")
      .selectAll(".shelter-row")
      .data(shelterData)
      .join("div")
      .attr("class", "shelter-row")
      .html(d => `
        <span>${d.type}</span>
        <div class="shelter-track"><div class="shelter-fill" style="width:${d.value}%;background:${d.color}"></div></div>
        <strong>${d.value}%</strong>
      `);
  }

  function init() {
    if (!window.d3) {
      showError("D3 did not load. Please check your internet connection.");
      return;
    }

    renderShelters();
    loadData().then(render).catch(() => {
      showError("Could not load the CSV data. Run this folder through a local server such as VS Code Live Server.");
    });
  }

  function render(data) {
    const svg = d3.select(".population-chart");
    const tooltip = d3.select(".tooltip");
    const margin = { top: 30, right: 26, bottom: 46, left: 64 };
    const outerWidth = 850;
    const outerHeight = 520;
    const width = outerWidth - margin.left - margin.right;
    const height = outerHeight - margin.top - margin.bottom;
    const formatDate = d3.timeFormat("%b %d, %Y");
    const formatYear = d3.timeFormat("%Y");
    const formatNumber = d3.format(",");
    const formatK = d => d === 0 ? "0" : `${d / 1000}k`;

    svg.attr("viewBox", [0, 0, outerWidth, outerHeight]);

    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
      .attr("id", "populationGradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");
    gradient.append("stop").attr("offset", "0%").attr("stop-color", "#2f7d5c").attr("stop-opacity", .86);
    gradient.append("stop").attr("offset", "100%").attr("stop-color", "#2f7d5c").attr("stop-opacity", .12);

    const chart = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const x = d3.scaleTime().domain(d3.extent(data, d => d.date)).range([0, width]);
    const y = d3.scaleLinear().domain([0, d3.max(data, d => d.population) * 1.08]).nice().range([height, 0]);

    const area = d3.area()
      .x(d => x(d.date))
      .y0(height)
      .y1(d => y(d.population))
      .curve(d3.curveMonotoneX);

    const line = d3.line()
      .x(d => x(d.date))
      .y(d => y(d.population))
      .curve(d3.curveMonotoneX);

    chart.append("text")
      .attr("class", "axis-title")
      .attr("x", -8)
      .attr("y", -12)
      .text("Population");

    chart.append("text")
      .attr("class", "axis-title")
      .attr("x", width)
      .attr("y", height + 38)
      .attr("text-anchor", "end")
      .text("Date");

    chart.append("g")
      .attr("class", "axis")
      .call(d3.axisLeft(y).ticks(5).tickFormat(formatK));

    chart.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(d3.timeYear.every(1)).tickFormat(formatYear));

    chart.append("path")
      .datum(data)
      .attr("class", "area")
      .attr("d", area);

    chart.append("path")
      .datum(data)
      .attr("class", "line")
      .attr("d", line);

    const hover = chart.append("g").style("display", "none");
    hover.append("line")
      .attr("class", "hover-line")
      .attr("y1", 0)
      .attr("y2", height);
    hover.append("circle")
      .attr("class", "hover-dot")
      .attr("r", 5);

    const bisect = d3.bisector(d => d.date).left;

    function showHover(event) {
      const [mx] = d3.pointer(event);
      const date = x.invert(mx);
      const index = Math.min(data.length - 1, Math.max(1, bisect(data, date)));
      const a = data[index - 1];
      const b = data[index];
      const d = date - a.date > b.date - date ? b : a;
      hover.attr("transform", `translate(${x(d.date)},0)`);
      hover.select("circle").attr("cy", y(d.population));
      tooltip.style("opacity", 1)
        .style("left", `${event.clientX}px`)
        .style("top", `${event.clientY}px`)
        .html(`<strong>${formatDate(d.date)}</strong>${formatNumber(d.population)} people`);
    }

    function hideHover() {
      hover.style("display", "none");
      tooltip.style("opacity", 0);
    }

    function updateStats(range) {
      const selected = data.filter(d => d.date >= range[0] && d.date <= range[1]);
      const rows = selected.length ? selected : data;
      const first = rows[0];
      const last = rows[rows.length - 1];
      const min = d3.min(rows, d => d.population);
      const max = d3.max(rows, d => d.population);
      const average = d3.mean(rows, d => d.population);
      const change = last.population - first.population;

      d3.select(".range-value").text(`${formatDate(range[0])} - ${formatDate(range[1])}`);
      d3.select(".min-value").text(formatNumber(min));
      d3.select(".max-value").text(formatNumber(max));
      d3.select(".avg-value").text(formatNumber(Math.round(average)));
      d3.select(".change-value").text(`${change >= 0 ? "+" : ""}${formatNumber(change)}`);
    }

    const brush = d3.brushX()
      .extent([[0, 0], [width, height]])
      .on("brush end", event => {
        const selection = event.selection;
        updateStats(selection ? selection.map(x.invert) : x.domain());
      });

    const brushLayer = chart.append("g")
      .attr("class", "brush")
      .call(brush);

    brushLayer
      .on("mouseenter", () => hover.style("display", null))
      .on("mousemove", showHover)
      .on("mouseleave", hideHover);

    const defaultRange = [new Date(2013, 11, 18), new Date(2015, 3, 8)];
    brushLayer.call(brush.move, defaultRange.map(x));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
