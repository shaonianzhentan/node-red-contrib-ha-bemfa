const axios = require('axios');
const qs = require('qs');
const crypto = require('crypto');
function md5(content) {
    return crypto.createHash('md5').update(content).digest("hex")
}

function log() {
    console.log(`【${new Date().toLocaleString()}】`, ...arguments)
}

module.exports = class {

    constructor(clientId, hass) {
        this.hass = hass
        this.clientId = clientId
        this.log = log
    }

    // 获取可用实体列表
    async getEntityList() {
        const arr = await this.hass.states.list()
        return arr.filter((state) => {
            const { entity_id, attributes } = state
            const name = attributes['friendly_name']
            const domain = entity_id.split('.')[0]
            // 名称是全中文
            if (!/^[\u4E00-\u9FA5]+$/.test(name)
                || ['light', 'input_boolean', 'switch'].includes(domain) === false
            ) return false
            return true
        })
    }

    // 更新巴法云设备
    async getBemfaDevice(isAll = false) {
        // 获取所有设备
        const res = await axios.get(`https://go.bemfa.com/v1/getmqttdata?&uid=${this.clientId}`)
        const topic_list = res.data.data.map(ele => ele.topic_id)
        // 格式化信息
        const entityList = await this.getEntityList()
        const list = entityList.map(state => {
            const { entity_id, attributes } = state
            const name = attributes['friendly_name']
            const domain = entity_id.split('.')[0]
            let uuid = md5(entity_id).substring(10, 23)
            let topic_id = ''
            // 灯
            if (domain === 'light' || (['input_boolean', 'switch'].includes(domain) && name.includes('灯'))) {
                topic_id = uuid + '002'
            }
            else if (['input_boolean', 'switch'].includes(domain)) {
                topic_id = uuid + '001'
            }
            return {
                topic_id,
                name,
                domain,
                entity_id
            }
        })
        // 获取可用设备
        if (isAll) {
            await Promise.all(list.map(({ topic_id, name }) => {
                return this.addTopic(topic_id, name, topic_list)
            }))
            return list
        }
        return list.filter(ele => topic_list.includes(ele.topic_id))
    }

    // 添加订阅
    async addTopic(topic, name, topic_list) {
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
