// Set up the visualization dimensions
const margin = { top: 40, right: 40, bottom: 60, left: 60 };
const width = 800 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

// Function to calculate duration in minutes from timeframe
function calculateDuration(timeFrame) {
    // Handle split timeframes (like "7:40pm-10pm and 1am-2:50am")
    if (timeFrame.includes("and")) {
        const [first, second] = timeFrame.split("and").map(t => t.trim());
        return calculateDuration(first) + calculateDuration(second);
    }

    const [start, end] = timeFrame.split("-").map(t => t.trim());
    
    // Convert time to 24-hour format
    function parseTime(time) {
        const isPM = time.toLowerCase().includes("pm");
        let [hours, minutes] = time.replace(/[ap]m/i, "").split(":").map(Number);
        if (isNaN(minutes)) minutes = 0;
        
        if (isPM && hours !== 12) hours += 12;
        if (!isPM && hours === 12) hours = 0;
        
        return hours * 60 + minutes;
    }

    const startMinutes = parseTime(start);
    let endMinutes = parseTime(end);
    
    // Handle cases where end time is next day
    if (endMinutes < startMinutes) {
        endMinutes += 24 * 60; // Add 24 hours worth of minutes
    }
    
    return endMinutes - startMinutes;
}

// Calculate durations for all entries
codingDiary.forEach(d => {
    d.duration = calculateDuration(d.timeFrame);
});

// Parse distraction times from the data
codingDiary.forEach(d => {
    // Convert text descriptions to minutes
    if (d.date === "2025-03-07") d.distraction = 60; // "around an hour"
    if (d.date === "2025-03-08") d.distraction = 120; // "2 hours"
    if (d.date === "2025-03-10") d.distraction = 30; // "30 minutes"
    if (d.date === "2025-03-14") d.distraction = 60; // "maximum 1 hour"
    if (d.date === "2025-03-15") d.distraction = 15; // estimate 15 minutes since not specified
    if (d.date === "2025-03-16") d.distraction = 90; // "1.5 hours"
    if (d.date === "2025-03-17") d.distraction = 30; // "30 minutes"
});

// Create SVG container
const svg = d3.select("#main-visualization")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// Create scales
const x = d3.scaleTime()
    .domain([
        d3.min(codingDiary, d => new Date(d.date)),
        d3.timeDay.offset(d3.max(codingDiary, d => new Date(d.date)), 1)  // Add 1 day padding
    ])
    .range([0, width])
    .nice();  // Nice rounds the domain to clean values

const y = d3.scaleLinear()
    .domain([0, 10])
    .range([height, 0]);

// Create a radial scale for the circles based on duration
const r = d3.scaleLinear()
    .domain([0, d3.max(codingDiary, d => d.duration)])
    .range([5, 30]);

// Create axes
const xAxis = d3.axisBottom(x)
    .tickFormat(d3.timeFormat("%b %d"))
    .ticks(d3.timeDay)  // Show tick for each day
    .tickSizeOuter(0);  // Remove outer ticks
const yAxis = d3.axisLeft(y);

svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(xAxis);

svg.append("g")
    .call(yAxis);

// Add X axis label
svg.append("text")
    .attr("class", "axis-label")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .style("text-anchor", "middle")
    .text("Dates");

// Add Y axis label
svg.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -40)
    .style("text-anchor", "middle")
    .text("Happiness Level");

// Add happiness line with gradient
const gradient = svg.append("defs")
    .append("linearGradient")
    .attr("id", "line-gradient")
    .attr("gradientUnits", "userSpaceOnUse")
    .attr("x1", 0)
    .attr("y1", y(0))
    .attr("x2", 0)
    .attr("y2", y(10))
    .selectAll("stop")
    .data([
        { offset: "0%", color: "#e74c3c" },
        { offset: "50%", color: "#f39c12" },
        { offset: "100%", color: "#2ecc71" }
    ])
    .enter()
    .append("stop")
    .attr("offset", d => d.offset)
    .attr("stop-color", d => d.color);

// Add happiness line
svg.append("path")
    .datum(codingDiary)
    .attr("fill", "none")
    .attr("stroke", "url(#line-gradient)")
    .attr("stroke-width", 2)
    .attr("d", d3.line()
        .x(d => x(new Date(d.date)))
        .y(d => y(d.happinessBefore)));

// Add control buttons
const buttonContainer = d3.select("#main-visualization")
    .insert("div", "svg")
    .attr("class", "button-container")
    .style("text-align", "center")
    .style("margin-bottom", "20px");

buttonContainer.append("button")
    .attr("class", "highlight-button")
    .attr("id", "before-button")
    .text("Show Before State")
    .on("click", function() {
        d3.selectAll(".after-circle").attr("opacity", 0.3);
        d3.selectAll(".before-circle").attr("opacity", 1);
        d3.selectAll(".highlight-button").classed("active", false);
        d3.select(this).classed("active", true);
    });

buttonContainer.append("button")
    .attr("class", "highlight-button")
    .attr("id", "after-button")
    .text("Show After State")
    .on("click", function() {
        d3.selectAll(".before-circle").attr("opacity", 0.3);
        d3.selectAll(".after-circle").attr("opacity", 1);
        d3.selectAll(".highlight-button").classed("active", false);
        d3.select(this).classed("active", true);
    });

// Add points for each day with multiple indicators
svg.selectAll(".coding-session")
    .data(codingDiary)
    .enter()
    .append("g")
    .attr("class", "coding-session")
    .attr("transform", d => `translate(${x(new Date(d.date))},${y(d.happinessBefore)})`)
    .each(function(d) {
        const g = d3.select(this);
        
        // Add outer circle for project type
        g.append("circle")
            .attr("class", "before-circle project-circle")
            .attr("r", d => r(d.duration))
            .attr("fill", d => d.project === "Adolescent.net" ? "#3498db" : 
                              d.project === "CameraRoll" ? "#9b59b6" : "#e67e22")
            .attr("opacity", 0.6)
            .on("mouseover", function(event) {
                d3.select(this).attr("opacity", 1);
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                tooltip.html(`
                    <strong>${d.date}</strong><br/>
                    Project: ${d.project}<br/>
                    Time Spent: ${d.duration} minutes<br/>
                    ${d.distraction ? `Distraction Time: ${d.distraction} minutes` : 'No distraction time recorded'}
                `)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
                d3.select(this).attr("opacity", 0.6);
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });

        // Add middle circle for company
        g.append("circle")
            .attr("class", "before-circle company-circle")
            .attr("r", d => r(d.duration) * 0.7)
            .attr("fill", d => d.company === "Alone" ? "#2d3436" : "#00b894")
            .attr("opacity", 0.8)
            .on("mouseover", function(event) {
                d3.select(this).attr("opacity", 1);
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                tooltip.html(`
                    <strong>${d.date}</strong><br/>
                    Company: ${d.company}
                `)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
                d3.select(this).attr("opacity", 0.8);
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });

        // Add inner circle for happiness in before state
        g.append("circle")
            .attr("class", "before-circle physical-circle")
            .attr("r", d => r(d.duration) * 0.4)
            .attr("fill", "#f1c40f")
            .attr("opacity", 0.8)
            .on("mouseover", function(event) {
                d3.select(this).attr("opacity", 1);
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                tooltip.html(`
                    <strong>${d.date}</strong><br/>
                    Happiness: ${d.happinessBefore}
                `)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
                d3.select(this).attr("opacity", 0.8);
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });

        // Add after state dot
        g.append("circle")
            .attr("class", d => d.happinessBefore === d.happinessAfter ? "after-circle before-circle" : "after-circle")
            .attr("r", d => r(d.duration) * 0.4)
            .attr("fill", d => d.hungryDehydrated ? "#ff6b6b" : "#4ecdc4")
            .attr("opacity", d => d.happinessBefore === d.happinessAfter ? 0.8 : 0.3)
            .attr("transform", d => `translate(0,${y(d.happinessAfter) - y(d.happinessBefore)})`)
            .on("mouseover", function(event) {
                d3.select(this).attr("opacity", 1);
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                tooltip.html(`
                    <strong>${d.date}</strong><br/>
                    Happiness: ${d.happinessAfter}<br/>
                    Physical State: ${d.hungryDehydrated ? "Hungry/Dehydrated" : "Well-fed & Hydrated"}
                `)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
                const d = d3.select(this).datum();
                d3.select(this).attr("opacity", d.happinessBefore === d.happinessAfter ? 0.8 : 0.3);
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });
    });

// Add tooltips
const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

// Create legends
const legend = d3.select("#legend");

// Add legend sections
const legendSections = [
    {
        title: "Project Type",
        items: [
            { color: "#3498db", text: "Adolescent.net" },
            { color: "#9b59b6", text: "CameraRoll" },
            { color: "#e67e22", text: "Personal Project" }
        ]
    },
    {
        title: "Company",
        items: [
            { color: "#2d3436", text: "Alone" },
            { color: "#00b894", text: "With Others" }
        ]
    },
    {
        title: "Physical State",
        items: [
            { color: "#4ecdc4", text: "Well-fed & Hydrated" },
            { color: "#ff6b6b", text: "Hungry/Dehydrated" }
        ]
    },
    {
        title: "Time Spent",
        items: [
            { color: "#f0f0f0", text: "Small Circle: 90-120 minutes" },
            { color: "#f0f0f0", text: "Medium Circle: 180-240 minutes" },
            { color: "#f0f0f0", text: "Large Circle: 240+ minutes" }
        ]
    }
];

// Create legend sections
legend.selectAll(".legend-section")
    .data(legendSections)
    .enter()
    .append("div")
    .attr("class", "legend-section")
    .each(function(d) {
        const section = d3.select(this);
        
        // Add section title
        section.append("h3")
            .attr("class", "legend-title")
            .text(d.title);
        
        // Add legend items
        section.selectAll(".legend-item")
            .data(d.items)
            .enter()
            .append("div")
            .attr("class", "legend-item")
            .each(function(item) {
                d3.select(this)
                    .append("div")
                    .attr("class", "legend-color")
                    .style("background-color", item.color);
                d3.select(this)
                    .append("div")
                    .attr("class", "legend-text")
                    .text(item.text);
            });
    }); 