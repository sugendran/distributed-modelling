function simulate(services, elemSelector) {
  const duration = 2 * 60 * 1000;
  const startTime = 1000;
  const endTime = startTime + duration;
  const serviceYCords = new Map(services.map((s,i) => [s.name, i]));

var sessions = [];

const margin = { top: 20, right: 30, bottom: 20, left: 100 };
const width = 500 - margin.left - margin.right;
const height = 1000 - margin.top - margin.bottom;

const x = d3.scaleLinear().domain([0, services.length]).range([0, width]);
const y = d3.scaleTime().domain([0, endTime]).range([0, height]);

const yAxis = d3.axisLeft(y).ticks(8).tickFormat(d3.timeFormat("%H:%M:%S"));

const line = d3.line()
    .x(stop => x(serviceYCords.get(stop.service)))
    .y(stop => y(stop.time));

const svg = d3.select("body").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

svg.append("defs").append("clipPath")
    .attr("id", "clip")
    .append("rect")
    .attr("y", -margin.top)
    .attr("width", width)
    .attr("height", height + margin.top + margin.bottom);


const service = svg.append("g")
    .attr("class", "service")
    .selectAll("g")
    .data(services)
    .enter().append("g")
    .attr("transform", function(d) {
        return "translate(" + x(serviceYCords.get(d.name)) + ",0)";
    });

service.append("text")
    .attr("x", -6)
    .attr("dy", ".35em")
    .attr("transform", function (d) {
      return "rotate(-90)";
    })
    .text(function(d) {
        return d.name;
    });

service.append("line").attr("y2", width);

svg.append("g")
    .attr("class", "y left axis")
    .call(yAxis);

const session = svg.append("g")
    .attr("class", "session")
    .attr("clip-path", "url(#clip)")
    .selectAll("g")
    .data(sessions)
    .enter().append("g");

session.append("path").attr("d", d => line(d.stops));

session.selectAll("circle")
    .data(function(d) {
        return d.stops;
    })
    .enter().append("circle")
    .attr("transform", function(d) {
        return "translate(" + x(serviceYCords.get(d.service)) + "," +  y(d.time) + ")";
    })
    .attr("r", 2);
}


simulate([{
    name: "user"
}, {
    name: "service1"
}, {
    name: "service2"
}, {
    name: "service3"
}], "body");
