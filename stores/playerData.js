import Player from '~/models/user/Player';
import { defineStore } from 'pinia';
import useGetUserDataLocalStorage from "~/composables/useGetUserDataLocalStorage";

export const usePlayerStore = defineStore('playerData', {
  state: () => ({
    username: null,
    user: {
      username: '',
      roomId: null,
      isSpy: false,
      location: 'Table',
      role: 'Player'
    }
  }),
  actions: {
    setUserData(username) {
      this.user = username
    },
    updatePlayerRole(data) {
      if (!data) {
        navigateTo('/')
      }

      const indexFound = data.game.players.findIndex(
        (p) => p.username === this.user.username && p.isAdmin
      );

      if (indexFound >= 0) {
        this.user.isAdmin = true
      } else {
        this.user.isAdmin = false
      }

    },
    updatePlayerPosition(players) {
      const indexFound = players.findIndex(p => p.username === this.user.username)
      if (indexFound >= 0) {
        const currentPosition = players[indexFound]
        this.user.isSpy = currentPosition.isSpy
        this.user.location = currentPosition.location
        this.user.role = currentPosition.role
      }

    },
    updatePlayerData(data) {
      this.updatePlayerRole(data)
    },
    setUsername(data) {
      this.user.username = data
    },
    setUserNameOnStorage(data) {
      const spyData = useGetUserDataLocalStorage()

      if (!!spyData) {
        spyData.username = data
        localStorage.setItem('spyData', JSON.stringify(spyData))
      } else {
        const spyData = {
          username: data,
          roomId: null
        }
        localStorage.setItem('spyData', JSON.stringify(spyData))
      }
    },
    setUserRoomId(data) {
      this.user.roomId = data
    },
    setUserRoomIdOnStorage(data) {
      const spyData = useGetUserDataLocalStorage()

      if (!!spyData) {
        spyData.roomId = data
        localStorage.setItem('spyData', JSON.stringify(spyData))
      }
    },
    unsetUserRoomIdOnStorage() {
      const spyData = useGetUserDataLocalStorage()
      if (!!spyData) {
        spyData.roomId = null
        localStorage.setItem('spyData', JSON.stringify(spyData))

      }

    },
    increment() {
      this.count++;
    },
  },
});