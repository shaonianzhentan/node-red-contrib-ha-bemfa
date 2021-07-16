const HomeAssistant = require('./ha')

module.exports = function (RED) {
    RED.nodes.registerType('ha-bemfa', function (config) {
        RED.nodes.createNode(this, config);
        this.server = RED.nodes.getNode(config.server);
        const hass = RED.nodes.getNode(config.hass);
        const node = this
        if (this.server && hass) {
            this.server.register(this)
            const ha = new HomeAssistant(this.server.clientid, hass.hass)
            node.on('input', function (msg) {
                const { payload } = msg
                ha.getBemfaDevice(true)
            })
            // 需要连接成功了，才执行订阅
            setTimeout(() => {
                ha.getBemfaDevice().then((entitys) => {
                    entitys.forEach(({ topic_id, domain, entity_id }) => {
                        console.log('訂閲', topic_id)
                        node.server.subscribe(topic_id, { qos: 0 }, (mtopic, mpayload, mpacket) => {
                            const payload = mpayload.toString()
                            const arr = payload.split('#')
                            const data = { entity_id }
                            if (arr.length === 2) {
                                data['brightness_pct'] = arr[1]
                            }
                            // 调用服务
                            const service = `${domain}.turn_${arr[0]}`
                            node.send({
                                service,
                                data,
                                payload
                            })
                            hass.callService(service, data).then(() => {
                                node.status({ fill: "green", shape: "ring", text: `调用服务：${service}` });
                            })
                        })
                    })
                    this.status({ fill: "green", shape: "ring", text: "配置成功" });
                })
            }, 5000)
        } else {
            this.status({ fill: "red", shape: "ring", text: "未配置" });
        }
    })
}