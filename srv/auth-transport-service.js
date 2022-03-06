const cds = require('@sap/cds')
const TransportHelper = require('./transportHelper')

class AuthTransportService extends cds.ApplicationService { init(){
    this.on('transportRoleCollections', async req => {
        const transportHelper = new TransportHelper(req.data.destinations)
        const roleCollections = req.data.roleCollections
        await transportHelper.initialize()
        return Promise.all(roleCollections.map(roleCollection => {
            return transportHelper.transportRoleCollection(roleCollection)
        }))
    })

    return super.init()
}}

module.exports = { AuthTransportService }