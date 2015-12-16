module.exports = {
    createExports: function (metadata, commands) {
        return {
            metadata: {
                family: metadata.family,
                plugin: metadata.plugin,
                label: metadata.label,
                tangible: true,
                actorTypes: [],
                sensorTypes: [],
                services: createServices(commands),
                events: createEvents(commands),
                configuration: [{id: "host", label: "Host", type: {id: "string"}}, {
                    id: "module",
                    label: "Module",
                    type: {id: "integer"},
                    defaultValue: 1
                }, {
                    id: "connector",
                    label: "Connector",
                    type: {id: "integer"},
                    defaultValue: 1
                }]
            },
            create: function () {
                return new InfraredLed().initialize(commands);
            }
        }
    }
};

var q = require('q');
var InfraredLedRemote;

function InfraredLed() {
    /**
     *
     */
    InfraredLed.prototype.initialize = function (commands) {
        for (var command in commands) {
            this[command] = new Function("parameters",
                "return this.submitCommand('" + commands[command] + "');");
        }

        return this;
    };

    /**
     *
     */
    InfraredLed.prototype.start = function () {
        var deferred = q.defer();

        this.state = {lastCode: null};

        if (this.isSimulated()) {
            deferred.resolve();
        } else {
            if (!InfraredLedRemote) {
                InfraredLedRemote = require("./InfraredLedRemote");
            }

            this.remote = InfraredLedRemote.create(this.configuration);

            console.log("Start learning");

            this.remote.learn(function (error, code) {
                if (error) {
                    this.logError(error);
                } else {
                    this.logInfo("Code", code);
                    this.state.lastCode = code;

                    for (var id in this.commands) {
                        if (code === this.commands[id]) {
                            this.publishEvent(this.commands[id]);

                            break;
                        }
                    }

                    this.publishStateChange();
                }
            }.bind(this));

            deferred.resolve();
        }

        return deferred.promise;
    };

    /**
     *
     */
    InfraredLed.prototype.stop = function () {
        return this.remote.stop();
    };

    /**
     *
     */
    InfraredLed.prototype.getState = function () {
        return this.state;
    };

    /**
     *
     */
    InfraredLed.prototype.setState = function () {
    };

    /**
     *
     */
    InfraredLed.prototype.submitCommand = function (command) {
        var deferred = q.defer();

        var irCommand = "sendir," + this.configuration.module + ":" + this.configuration.connector + "," + command;

        this.logInfo("Submitting command '" + irCommand + "'.");

        if (this.isSimulated()) {
        }
        else {
            this.remote.send(irCommand, function (error) {
                if (error) {
                    this.logError(error);
                    deferred.reject(error);
                } else {
                    deferred.resolve();
                }
            }.bind(this));
        }

        return deferred.promise;
    };
}

/**
 *
 */
function createServices(commands) {
    var services = [];

    for (var command in commands) {
        services.push({id: command, label: command});
    }

    return services;
};

/**
 *
 */
function createEvents(commands) {
    var events = [];

    for (var command in commands) {
        events.push({id: command, label: command});
    }

    return events;
};
