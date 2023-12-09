class Player {
    constructor(){
        this.username = null
        this.isAdmin = false
        this.roomId = ''
        this.isSpy = false
        this.location = ''
    }

    fromData(data){
        this.username = data.username
        this.roomId = data.roomId
    }
}

export default Player