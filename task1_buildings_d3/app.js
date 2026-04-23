(function () {
  "use strict";

  const DATA_FILE = "data/buildings.csv";
  const IMAGE_DIR = "img/";
  const preferredSelection = "One World Trade Center";
  const fallbackData = [
    { building: "Burj Khalifa", country: "United Arab Emirates", city: "Dubai", height_m: 828, height_ft: 2717, floors: 163, completed: 2010, image: "1.jpg" },
    { building: "International Commerce Centre", country: "China", city: "Hong Kong", height_m: 484, height_ft: 1588, floors: 108, completed: 2010, image: "6.jpg" },
    { building: "KK100", country: "China", city: "Shenzhen", height_m: 442, height_ft: 1449, floors: 100, completed: 2011, image: "10.jpg" },
    { building: "Makkah Royal Clock Tower", country: "Saudi Arabia", city: "Mecca", height_m: 601, height_ft: 1972, floors: 120, completed: 2012, image: "2.jpg" },
    { building: "One World Trade Center", country: "United States", city: "New York City", height_m: 541, height_ft: 1776, floors: 94, completed: 2014, image: "3.jpg" },
    { building: "Petronas Twin Towers", country: "Malaysia", city: "Kuala Lumpur", height_m: 452, height_ft: 1483, floors: 88, completed: 1998, image: "7.jpg" },
    { building: "Shanghai World Financial Center", country: "China", city: "Shanghai", height_m: 492, height_ft: 1614, floors: 101, completed: 2008, image: "5.jpg" },
    { building: "Taipei 101", country: "Taiwan", city: "Taipei", height_m: 508, height_ft: 1667, floors: 101, completed: 2004, image: "4.jpg" },
    { building: "Willis Tower", country: "United States", city: "Chicago", height_m: 442, height_ft: 1451, floors: 108, completed: 1974, image: "9.jpg" },
    { building: "Zifeng Tower", country: "China", city: "Nanjing", height_m: 450, height_ft: 1476, floors: 66, completed: 2010, image: "8.jpg" }
  ];

  function normalize(row) {
    return {
      building: row.building,
      country: row.country,
      city: row.city,
      height_m: +row.height_m,
      height_ft: +row.height_ft,
      floors: +row.floors,
      completed: +row.completed,
      image: row.image
    };
  }

  async function loadData() {
    try {
      const rows = await d3.csv(DATA_FILE, normalize);
      return rows.filter(d => d.building && Number.isFinite(d.height_m));
    } catch (error) {
      return fallbackData.map(normalize);
    }
  }

  function showError(message) {
    d3.select("#app").append("div")
      .attr("class", "error")
      .text(message);
  }

  function countTo(selection, value, format) {
    selection.each(function () {
      const node = this;
      const start = +(node.dataset.current || 0);
      node.dataset.current = value;
      d3.select(node)
        .transition()
        .duration(650)
        .tween("text", function () {
          const interpolate = d3.interpolateNumber(start, value);
          return function (t) {
            node.textContent = format(interpolate(t));
          };
        });
    });
  }

  function init() {
    if (!window.d3) {
      showError("D3 did not load. Please check your internet connection.");
      return;
    }

    loadData().then(render);
  }

  function render(data) {
    const svg = d3.select(".chart");
    const detail = d3.select(".detail-panel");
    const tooltip = d3.select(".tooltip");
    const summaryName = d3.select(".selected-name");
    const summaryHeight = d3.select(".selected-height");
    const summaryYear = d3.select(".selected-year");
    const formatNumber = d3.format(",");
    const margin = { top: 18, right: 26, bottom: 44, left: 220 };
    const outerWidth = 840;
    const outerHeight = 520;
    const width = outerWidth - margin.left - margin.right;
    const height = outerHeight - margin.top - margin.bottom;
    let sortMode = "height";
    let selected = data.find(d => d.building === preferredSelection) || data[0];

    svg.attr("viewBox", [0, 0, outerWidth, outerHeight]);
    const chart = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const x = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.height_m) * 1.05])
      .range([0, width]);
    const y = d3.scaleBand().range([0, height]).padding(0.28);
    const xAxis = chart.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${height})`);

    chart.append("text")
      .attr("class", "x-label")
      .attr("x", width)
      .attr("y", height + 35)
      .attr("text-anchor", "end")
      .text("Height in meters");

    function sortedData() {
      return [...data].sort((a, b) => {
        if (sortMode === "height") return d3.descending(a.height_m, b.height_m);
        return d3.ascending(a.building, b.building);
      });
    }

    function selectBuilding(d) {
      if (!d || d.building === selected.building) return;
      selected = d;
      drawBars();
      drawDetail();
    }

    function selectByOffset(offset) {
      const current = sortedData();
      const index = current.findIndex(d => d.building === selected.building);
      const nextIndex = Math.max(0, Math.min(current.length - 1, index + offset));
      selectBuilding(current[nextIndex]);
    }

    function drawBars() {
      const current = sortedData();
      y.domain(current.map(d => d.building));

      xAxis.transition()
        .duration(650)
        .call(d3.axisBottom(x).ticks(5).tickSizeOuter(0));

      const rows = chart.selectAll(".building-row")
        .data(current, d => d.building)
        .join(
          enter => {
            const row = enter.append("g")
              .attr("class", "building-row")
              .attr("transform", d => `translate(0,${y(d.building)})`)
              .style("opacity", 0);
            row.append("text")
              .attr("class", "name")
              .attr("x", -14)
              .attr("y", y.bandwidth() / 2)
              .attr("dy", "0.35em")
              .attr("text-anchor", "end");
            row.append("rect")
              .attr("height", y.bandwidth())
              .attr("width", 0);
            row.append("text")
              .attr("class", "height-label")
              .attr("y", y.bandwidth() / 2)
              .attr("dy", "0.35em")
              .attr("text-anchor", "end");
            return row;
          },
          update => update,
          exit => exit.transition().duration(300).style("opacity", 0).remove()
        );

      rows.on("click", (event, d) => selectBuilding(d))
        .on("mouseenter", (event, d) => {
          tooltip.style("opacity", 1)
            .html(`<strong>${d.building}</strong>${d.height_m} m<br>${d.completed}`);
        })
        .on("mousemove", event => {
          tooltip.style("left", `${event.clientX}px`).style("top", `${event.clientY}px`);
        })
        .on("mouseleave", () => tooltip.style("opacity", 0));

      rows.transition()
        .duration(700)
        .attr("transform", d => `translate(0,${y(d.building)})`)
        .style("opacity", 1);

      rows.select("text.name")
        .text(d => d.building)
        .classed("selected", d => d.building === selected.building);

      rows.select("rect")
        .classed("selected", d => d.building === selected.building)
        .transition()
        .duration(700)
        .attr("height", y.bandwidth())
        .attr("width", d => x(d.height_m));

      rows.select("text.height-label")
        .text(d => d.height_m)
        .transition()
        .duration(700)
        .attr("x", d => Math.max(34, x(d.height_m) - 12))
        .attr("y", y.bandwidth() / 2);
    }

    function drawDetail() {
      summaryName.text(selected.building);
      countTo(summaryHeight, selected.height_m, d => `${formatNumber(Math.round(d))} m`);
      countTo(summaryYear, selected.completed, d => Math.round(d));

      detail.html(`
        <img class="tower-photo" src="${IMAGE_DIR}${selected.image}" alt="${selected.building}">
        <div class="detail-content">
          <h2>${selected.building}</h2>
          <div class="place">${selected.city}, ${selected.country}</div>
          <div class="facts">
            <div class="fact"><span>Height</span><strong><span class="height-count" data-current="0"></span> m</strong></div>
            <div class="fact"><span>Feet</span><strong><span class="feet-count" data-current="0"></span> ft</strong></div>
            <div class="fact"><span>Floors</span><strong><span class="floors-count" data-current="0"></span></strong></div>
            <div class="fact"><span>Completed</span><strong><span class="year-count" data-current="0"></span></strong></div>
          </div>
          <p class="keyboard-note">Use Up / Down to change the selected building.</p>
        </div>
      `);
      countTo(detail.select(".height-count"), selected.height_m, d => formatNumber(Math.round(d)));
      countTo(detail.select(".feet-count"), selected.height_ft, d => formatNumber(Math.round(d)));
      countTo(detail.select(".floors-count"), selected.floors, d => formatNumber(Math.round(d)));
      countTo(detail.select(".year-count"), selected.completed, d => Math.round(d));
    }

    d3.selectAll(".controls button").on("click", function () {
      sortMode = this.dataset.sort;
      d3.selectAll(".controls button").classed("active", false);
      d3.select(this).classed("active", true);
      drawBars();
    });

    document.addEventListener("keydown", event => {
      if (!["ArrowUp", "ArrowDown"].includes(event.key)) return;
      event.preventDefault();
      selectByOffset(event.key === "ArrowDown" ? 1 : -1);
    });

    drawBars();
    drawDetail();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
