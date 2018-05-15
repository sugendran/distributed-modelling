function Session() {
    this.stops = [];
}
Session.prototype.addStop = function (service, time) {
    this.stops.push({ service, time });
}

function Model(userDefinition, serviceDefinitions) {
    const duration = 2 * 60 * 1000;
    const startTime = 1000;
    const endTime = startTime + duration;
    const clock = new Clock(startTime, endTime);
    const msPerRequest = Math.floor(1000 / userDefinition.rps);

    this._clock = clock;
    this._endTime = endTime;

    this.serviceXCords = new Map(serviceDefinitions.map((s, i) => [s.name, i + 1]));
    this.services = new Map(
        serviceDefinitions.map((s) => [s.name, new Service(s, clock, this.requester.bind(this))])
    );
    this.serviceXCords.set("user", 0);
    this.services.set("user", new Service(userDefinition, clock, this.requester.bind(this)));
    this.sessions = [];

    clock.setTimeout(async () => {
        let reloads = 0;
        const session = new Session();
        this.sessions.push(session);
        do {
            try {
                await this.requester(session, "user");
            } catch (e) {
                console.error(e);
                reloads++;
            }
        } while (reloads <= userDefinition.reloadsOnFail)
    }, msPerRequest)
}
Model.prototype.run = function () {
    this._clock.runToEnd();
}

Model.prototype.requester = function (session, serviceName, timeout = 30000, retries = 0) {
    const service = this.services.get(serviceName);
    if (service === undefined) {
        debugger;
        throw new Error(`Could not find service ${serviceName}`);
    }
    return new Promise(async (resolve, reject) => {
        let retryCount = 0;
        do {
            const requestingService =
                session.stops.length === 0 
                ? null
                : session.stops[session.stops.length -1].service;

            try {
                session.addStop(serviceName, this._clock.now());
                await service.request(session, timeout);
                session.addStop(serviceName, this._clock.now());
                if (requestingService !== null)
                    session.addStop(requestingService, this._clock.now());
                resolve();
            } catch (e) {
                console.error(e);
                if (requestingService !== null)
                    session.addStop(requestingService, this._clock.now());
                retryCount++;
            }
        } while (retryCount <= retries);
        reject("request failed");
    });
}
Model.prototype.render = function (elemSelector) {
    const serviceXCords = this.serviceXCords;
    const margin = {
        top: 20,
        right: 30,
        bottom: 20,
        left: 100
    };
    const width = 500 - margin.left - margin.right;
    const height = 2000 - margin.top - margin.bottom;

    const x = d3.scaleLinear().domain([0, serviceXCords.size]).range([0, width]);
    const y = d3.scaleTime().domain([0, this._endTime]).range([0, height]);

    const yAxis = d3.axisLeft(y).ticks(8).tickFormat(d3.timeFormat("%H:%M:%S"));

    const line = d3.line()
        .x(stop => x(serviceXCords.get(stop.service)))
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
        .data([...serviceXCords.keys()])
        .enter().append("g")
        .attr("transform", function (name) {
            return "translate(" + x(serviceXCords.get(name)) + ",0)";
        });

    service.append("text")
        .attr("x", -6)
        .attr("dy", ".35em")
        .attr("transform", function (d) {
            return "rotate(-90)";
        })
        .text(function (name) {
            return name;
        });

    service.append("line").attr("y2", width);

    svg.append("g")
        .attr("class", "y left axis")
        .call(yAxis);

    const session = svg.append("g")
        .attr("class", "session")
        .attr("clip-path", "url(#clip)")
        .selectAll("g")
        .data(this.sessions)
        .enter().append("g");

    session.append("path").attr("d", d => line(d.stops));

    session.selectAll("circle")
        .data(function (d) {
            return d.stops;
        })
        .enter().append("circle")
        .attr("transform", function (d) {
            return "translate(" + x(serviceXCords.get(d.service)) + "," + y(d.time) + ")";
        })
        .attr("r", 2);
}

var simulation = new Model({
    rps: 1,
    p0: 200,
    p100: 1000,
    deadline: 6000,
    reloadsOnFail: 1,
    sequence: [{
        request: "service1",
        retriesOnFail: 1
    }]
}, [{
    name: "service1",
    type: "service",
    p0: 200,
    p100: 1000,
    deadline: 2000,
    sequence: [{
        request: "service2",
        retriesOnFail: 2
    }]
}, {
    name: "service2",
    type: "service",
    p0: 200,
    p100: 1000,
    sequence: [{
        request: "database",
        retriesOnFail: 2
    }]
}, {
    name: "database",
    type: "datastore",
    p0: 200,
    p100: 1000
}]);
simulation.run();
setTimeout(() => 
simulation.render("body"), 10);