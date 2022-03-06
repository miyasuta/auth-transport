const httpclient = require('@sap-cloud-sdk/http-client')

module.exports = class TransportHelper {
    constructor (destinations) {
        this.destinations = {
            "source": destinations.source,
            "target": destinations.target
        }
        this.suffix = {}
    }

    async initialize() {
        return Promise.all([
            this._loadSuffix("source"), 
            this._loadSuffix("target")
        ])     
    }

    async transportRoleCollection (roleCollection) {
        try {
            let roleCollectionSource = await this._fetchRoleCollection(roleCollection)
            let roleCollectionTarget = await this._replaceSuffix(roleCollectionSource)
            await this._registerRoleCollection(roleCollectionTarget)
            return {
                roleCollection: roleCollection,
                result: 'success'
            }
        } catch (err) {
            return {
                roleCollection: roleCollection,
                result: 'error',
                message: err.message
            }
        }
    }

    async _loadSuffix(target) {
        let data = await SELECT .one .columns `suffix` .from `Suffix` .where `destination = ${this.destinations[target]}`
        if (!data) {
            throw new Error(`No suffix found for destination ${this.destinations[target]}`)
        }           
        this.suffix[target] = data.suffix        
    }

    async _fetchRoleCollection (roleCollection) {
        const dest = {
            destinationName : this.destinations["source"]
        }
        try {
            const response = await httpclient.executeHttpRequest(dest, {
                method: 'GET',
                url: `/sap/rest/authorization/v2/rolecollections/${roleCollection}`
            })
            return response.data
        } catch (err) {
            if (err.response?.status === 404) {
                throw new Error(`Role Collection ${roleCollection} not found`)
            } else {
                throw err
            }            
        }
    }

    async _replaceSuffix (roleCollection) {
        const sourceSuffix = this.suffix["source"]
        const targetSuffix = this.suffix["target"]
        const newRoleCollection = JSON.parse(JSON.stringify(roleCollection)); //deep copy
        newRoleCollection.roleReferences.map(roleReference => {
            roleReference.roleTemplateAppId = roleReference.roleTemplateAppId.replace(sourceSuffix, targetSuffix)
            return roleReference
        })
        return newRoleCollection
    }

    async _registerRoleCollection(roleCollection) {
        const dest = {
            destinationName : this.destinations["target"]
        }

        //check if the role Collection already exists
        try {
            const response = await httpclient.executeHttpRequest(dest, {
                method: 'GET',
                url: `/sap/rest/authorization/v2/rolecollections/${roleCollection.name}`
            })
            return this._updateRoleCollection(roleCollection, response.data, dest)
        } catch (err) {
            if (err.response?.status === 404) {
                //role collection does not exist, create it
                return httpclient.executeHttpRequest(dest, {
                    method: 'POST',
                    url: `/sap/rest/authorization/v2/rolecollections`,
                    data: roleCollection
                },{ fetchCsrfToken: false })
            } else {
                throw err
            }
        }
    }

    _updateRoleCollection(roleCollection, existingRoleCollection, dest) {
        const sourceRoles = roleCollection.roleReferences
        const targetRoles = existingRoleCollection.roleReferences

        const rolesToAdd = this._getDiff(sourceRoles, targetRoles)
        const rolesToRemove = this._getDiff(targetRoles, sourceRoles)

        const addPromise = httpclient.executeHttpRequest(dest, {
            method: 'PUT',
            url: `/sap/rest/authorization/v2/rolecollections/${roleCollection.name}/roles`,
            data: rolesToAdd
        },{ fetchCsrfToken: false })

        const removePromises = rolesToRemove.map(role => {
            const roleName = role.roleName ? role.roleName : role.roleTemplateName
            return httpclient.executeHttpRequest(dest, {
                method: 'DELETE',
                url: `/sap/rest/authorization/v2/rolecollections/${roleCollection.name}/roles/${role.roleTemplateAppId}/${roleName}/${role.roleTemplateName}`
            },{ fetchCsrfToken: false })
        })
        return Promise.all([addPromise, ...removePromises])
    }

    _getDiff(source, target) {
        if(!source) {
            return []
        }
        return source.reduce((acc, role) => {
            if (!this._roleExists(role, target)) {
                acc.push(role)
            }
            return acc
        }, [])
    }

    _roleExists(role, roles) {
        if(!roles) { 
            return false
        }
        return roles.some(r => r.roleTemplateAppId === role.roleTemplateAppId && r.roleTemplateName === role.roleTemplateName)
    }

}
