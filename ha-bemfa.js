const HomeAssistant = require('./ha')

module.exports = function (RED) {
    RED.nodes.registerType('ha-bemfa', function (config) {
        RED.nodes.createNode(this, config);
        this.server = RED.nodes.getNode(config.server);
        const hass = RED.nodes.getNode(config.hass);

        if (this.server && hass) {
            this.server.register(this)
            const ha = new HomeAssistant(this.server.clientid, hass.hass)

            ha.getEntity().then(() => {
                this.status({ fill: "blue", shape: "ring", text: "配置成功" });
            })

        } else {
            this.status({ fill: "red", shape: "ring", text: "未配置" });
        }
    })
}