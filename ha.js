const axios = require('axios');
const qs = require('qs');
const crypto = require('crypto');
function md5(content) {
    return crypto.createHash('md5').update(content).digest("hex")
}

module.exports = class {

    constructor(clientId, hass) {
        this.hass = hass
        this.clientId = clientId
        this.log = log
    }

    // 获取所有实体
    async getEntity() {

        const res = await axios.get(`https://go.bemfa.com/v1/getmqttdata?&uid=${this.clientId}`)
        const topic_list = res.data.data.map(ele => ele.topic_id)

        const entity = {}
        const arr = await this.hass.states.list()
        arr.forEach((state) => {
            const { entity_id, attributes } = state
            const name = attributes['friendly_name']
            const domain = entity_id.split('.')[0]
            let uuid = md5(entity_id).substring(10, 23)
            // 只有中文名称才行
            if (/^[\u4E00-\u9FA5]+$/.test(name) == false) {
                return
            }
            // 灯
            if (domain === 'light' || (['input_boolean', 'switch'].includes(domain) && name.includes('灯'))) {
                const topic = uuid + '002'
                console.log(topic, domain, name)
                entity[topic] = {
                    name,
                    domain,
                    entity_id
                }
                return
            }
            // 插座
            if (['input_boolean', 'switch'].includes(domain)) {
                const topic = uuid + '001'
                console.log(topic, domain, name)
                entity[topic] = {
                    name,
                    domain,
                    entity_id
                }
                return
            }
        })
        // 添加设备
        await Promise.all(Object.keys(entity).map(key => {
            return this.addTopic(key, entity[key].name, topic_list)
        }))
        this.entity = entity
        return entity
    }

    // 添加订阅
    addTopic(topic, name, topic_list) {
        let res = null
        // 删除主题
        // res = await axios.get(`https://go.bemfa.com/v1/deltopic?umail=${this.clientId}&vtype=1&topic=${topic}`)
        // log(res.data)

        // 如果不存在，则添加
        if (!topic_list.includes(topic)) {
            // 添加订阅
            res = await axios.post('https://go.bemfa.com/v1/addtopic', qs.stringify({
                umail: this.clientId,
                vtype: 1,
                topic
            }))
            this.log('添加设备', res.data)
        }
        // 设置名称
        res = await axios.get(`https://go.bemfa.com/v1/setname?umail=${this.clientId}&vtype=1&topic=${topic}&name=${encodeURIComponent(name)}`)
        this.log('设置名称', res.data)
    }

}
