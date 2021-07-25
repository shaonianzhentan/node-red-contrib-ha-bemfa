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

            const listening = (entitys) => {
                // 监听服务
                node.server.client.on('message', (mtopic, mpayload, mpacket) => {
                    const entity = entitys.find(ele => ele.topic_id == mtopic)
                    if (!entity) return;
                    const { domain, entity_id } = entity
                    const payload = mpayload.toString()
                    console.log(mtopic, payload)
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
                });
                // 订阅
                entitys.forEach(({ topic_id }) => {
                    console.log('訂閲', topic_id)
                    node.server.client.subscribe(topic_id, { qos: 0 });
                })
                node.status({ fill: "green", shape: "ring", text: "配置成功" });
            }

            node.on('input', function (msg) {
                const { payload } = msg
                node.status({ fill: "blue", shape: "ring", text: "重新配置" });
                ha.getBemfaDevice(true).then(listening)
            })
            // 需要连接成功了，才执行订阅
            setTimeout(() => {
                ha.getBemfaDevice().then(listening)
            }, 5000)
        } else {
            this.status({ fill: "red", shape: "ring", text: "未配置" });
        }
    })
}