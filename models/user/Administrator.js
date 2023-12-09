class Administrator {
    constructor(){
        this.username = null
        this.isAdmin = true
        this.roomId = null
        this.isSpy = false
        this.location = ''
    }

    fromData(data){
        this.username = data.username
        this.roomId = data.roomId
    }
}

export default Administrator