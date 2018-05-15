// normal distribution
const distribution = [
    0.0, 0.0, 0.0,
    0.1, 0.1, 0.1, 0.1, 0.1, 0.1,
    0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2,
    0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3,
    0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4,
    0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5,
    0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6,
    0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7,
    0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8,
    0.9, 0.9, 0.9, 0.9, 0.9, 0.9,
    1.0, 1.0, 1.0
];

function randomValue(min, max) {
    const index = Math.floor(Math.random() * distribution.length);
    const rand = distribution[index];
    return ((max - min) * rand) + min;
}

/*
services?
request -> wait -> respond
request -> run sequence -> possibly wait -> respond
*/
function Service(serviceDef, clock, requester) {
    this._clock = clock;
    this._deadline = serviceDef.deadline;
    this._sequence = serviceDef.sequence;
    this._requester = requester;
    this._p0 = serviceDef.p0;
    this._p100 = serviceDef.p100;
}
Service.prototype.wait = function (wait) {
    return new Promise((resolve, reject) => {
        this._clock.setTimeout(() => {
            resolve();
        }, wait);
    });
}
Service.prototype.request = function (session, timeout) {
    const clock = this._clock;
    const start = clock.now();
    const deadline = this._deadline !== undefined ? this._deadline : -1;
    const serviceWaitTime = randomValue(this._p0, this._p100);

    return new Promise(async (resolve, reject) => {
        let elapsedTime = 0;
        let completed = false;
        // at some point the client will timeout, this does not mean we
        // stop processing, it just means we reject the promise
        const willTimeout = clock.setTimeout(() => {
            if (completed) {
                return;
            }
            completed = true;
            reject("timed out");
        }, timeout);

        // add in some network latency
        await this.wait(10);

        // play the sequence before we hit the deadline
        for (let i = 0; i < this._sequence.length && (deadline > 0 && elapsedTime < deadline); i++) {
            const item = this._sequence[i];
            if (item.wait !== undefined) {
                await this.wait(item.wait);
            } else if (item.request !== undefined) {
                await this._requester(session, item.request, item.timeout, item.retriesOnFail);
            }
            elapsedTime = clock.now() - start;
        }
        // now wait for however long this service takes to do it's thing
        // and if there is a deadline we use whatever time we have left
        // before expiring the final timeout
        console.log("waiting " + serviceWaitTime + "ms @ " + clock.now());
        const fin = clock.setTimeout(() => {
            console.log("waited " + serviceWaitTime + "ms @ " + clock.now());
            if (!completed) {
                if (completed) {
                    return;
                }
                completed = true;
                clock.clearInterval(willTimeout);
                resolve();
            }
        }, serviceWaitTime);
        if (deadline > 0) {
            clock.setTimeout(() => {
                if (completed) {
                    return;
                }
                completed = true;
                clock.clearInterval(fin);
                clock.clearInterval(willTimeout);
                reject("deadline hit");
            }, deadline - elapsedTime);
        }
    })
}
