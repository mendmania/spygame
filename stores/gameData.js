import Game from '~/models/game/Game';
import { defineStore } from 'pinia';

export const useGameStore = defineStore('gameData', {
    state: () => ({
        gameData: null,
    }),
    actions: {
        increment() {
            this.count++;
        },
        setGameData(data) {
            const gameData = new Game()
            // gameData.fromData(data)
            this.gameData = gameData
        },
        startGame() {
            
        },
        updateGameData(data){
            this.gameData = data
        }
    },
});