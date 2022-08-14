class SyncError extends Error{
    constructor(message, status = null, ...params){
        super(...params)
        this.message = message;
        this.status = status;
    }
}

module.exports = SyncError