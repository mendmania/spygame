// plugins/firebaseConfig.js

// import 'firebase/database';

import { child, get, getDatabase, onValue, ref, set } from "firebase/database";

import { SPY_LOCATIONS } from "~/constants/SPY_LOCATIONS";
import { initializeApp } from 'firebase/app';
import { useGameStore } from "~/stores/gameData";
import useGetUserDataLocalStorage from "~/composables/useGetUserDataLocalStorage";
import { usePlayerStore } from "~/stores/playerData";

// import firebase from 'firebase/app';

export default defineNuxtPlugin((nuxtApp) => {
  if (process.client) {
    const config = useRuntimeConfig();
    const firebaseConfig = {
      apiKey: config.public.apiKey,
      authDomain: config.public.authDomain,
      projectId: config.public.projectId,
      storageBucket: config.public.storageBucket,
      messagingSenderId: config.public.messagingSenderId,
      appId: config.public.appId,
      measurementId: config.public.measurementId
    };


    const app = initializeApp(firebaseConfig);
    const database = getDatabase(app);

    function writeUserData(userId, name, email, imageUrl) {
      set(ref(database, 'rooms/' + userId), {
        username: name,
        email: email,
        profile_picture: imageUrl
      });
    }

    const createRoom = async (roomId, gameData) => {
      set(ref(database, 'rooms/' + roomId), {
        game: gameData,
      });
    }


    const joinGame = async (roomId, userData) => {
      const allRooms = await getRooms()

      const roomExists = allRooms[roomId]

      if (!roomExists) return false

      const { players } = roomExists.game

      if (players.findIndex(v => v.username === userData.username) === -1) {
        players.push(userData)

        roomExists.game.players = players

        if (!!roomExists) {
          set(ref(database, 'rooms/' + roomId), {
            game: roomExists.game,
          });
        }
      }

      if (!!roomExists) {
        navigateTo(`/room/${roomId}`)
      }

      return true

    }

    const getRooms = async () => {
      try {
        const dbRef = ref(database);
        const snapshot = await get(child(dbRef, `rooms`))

        if (snapshot.exists()) {
          console.log(snapshot.val());
        } else {
          console.log("No data available");
        }

        return snapshot.val()
      } catch (error) {
        console.error(error)
      }

    }

    const getRoomData = async (roomId) => {
      try {
        const dbRef = ref(database);
        const snapshot = await get(child(dbRef, `rooms/${roomId}`))

        if (snapshot.exists()) {
          console.log(snapshot.val());
        } else {
          console.log("No data available");
        }

        return snapshot.val()
      } catch (error) {
        console.error(error)
      }

    }

    const getRealtimeRoomData = async (roomId) => {
      const gameStore = useGameStore();
      const playerStore = usePlayerStore();

      const starCountRef = ref(database, `rooms/${roomId}`);
      onValue(starCountRef, (snapshot) => {
        const data = snapshot.val();
        gameStore.updateGameData(data)
        playerStore.updatePlayerData(data)
        // console.log('UPDATE Game data', roomId, data)
        playerStore.updatePlayerPosition(data.game.players)

      });
    }

    const getRandomInt = async max => {
      if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
        const randomArray = new Uint32Array(1);
        window.crypto.getRandomValues(randomArray);
        return randomArray[0] % max;
      } else {
        return Math.floor(Math.random() * max);
      }
    }

    // const locationLength = 10; // Replace this with your desired maximum value
    // const randomIndex = await getRandomInt(locationLength);

    const startStopGameById = async (roomId, activate = true, gameTime = 8) => {
      const allRooms = await getRooms()

      const roomExists = allRooms[roomId]

      roomExists.game.isActive = activate

      if (!activate) {
        roomExists.game.startTime = false
      }

      if (activate) {

        roomExists.game.startTime = startGameTime(gameTime)

        const playersLength = roomExists.game.players.length
        const randomIndex = await getRandomInt(playersLength);

        const locationLength = SPY_LOCATIONS.length
        const randomLocationIndex = await getRandomInt(locationLength);

        const locationData = SPY_LOCATIONS[randomLocationIndex]
        roomExists.game.players.map((v, i) => {
          const roleLength = locationData.roles.length
          const randomRoleIndex = Math.floor(Math.random() * roleLength);

          v.location = locationData.location
          v.role = locationData.roles[randomRoleIndex]

          if (i === randomIndex) {
            v.isSpy = true
            v.location = 'Secret Location'
            v.role = 'Spy'
          } else {
            v.isSpy = false
          }

          return v
        })

      }

      if (!!roomExists) {
        set(ref(database, 'rooms/' + roomId), {
          game: roomExists.game
        });
      }
    }

    const startGameTime = (data = 8) => {
      const startDate = new Date()
      const time = startDate.getTime()
      let timeInSeconds = (time / 60000)
      timeInSeconds += data
      timeInSeconds = timeInSeconds * 60000

      return Math.floor(timeInSeconds)
    }

    const endGameById = async (roomId) => {
      const allRooms = await getRooms()
      const roomExists = allRooms[roomId]

      localStorage.removeItem('spyroom')
      const spyData = useGetUserDataLocalStorage()
      spyData.roomId = null
      localStorage.setItem("spyData", JSON.stringify(spyData));

      if (!!roomExists) {
        set(ref(database, 'rooms/' + roomId), {
          game: null
        });
      }


      navigateTo(`/`)
    }

    const removePlayerFromRoomById = async (roomId, userId) => {
      const allRooms = await getRooms()
      const roomExists = allRooms[roomId]


      roomExists.game.players = roomExists.game.players.filter(user => user.username !== userId)

      if (!!roomExists) {
        set(ref(database, 'rooms/' + roomId), {
          game: roomExists.game
        });
      }

    }


    return {
      provide: {
        firebase: {
          app,
          database,
          writeUserData,
          createRoom,
          joinGame,
          getRooms,
          getRoomData,
          getRealtimeRoomData,
          startStopGameById,
          endGameById,
          removePlayerFromRoomById,
        }
      }
    }


  }
})
