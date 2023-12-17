import Administrator from "../user/Administrator"

class Game {
    constructor() {
        this.roomId = ''
        this.isActive = false
        this.startTime = 0
        this.players = []
        this.spies = []
        this.place = null
    }

    fromData(roomId) {
        this.roomId = roomId
        this.players = []
        this.spies = []
        this.place = null
    }

    addPlayer(data) {
        const player = new Administrator()
        player.fromData(data)
        this.players.push(player)
    }

    startGame(gameTime = 8) {
        this.isActive = true

    }
}

export default Game