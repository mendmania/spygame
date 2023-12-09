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
      authDomain:config.public.authDomain,
      projectId: config.public.projectId,
      storageBucket: config.public.storageBucket,
      messagingSenderId: config.public.messagingSenderId,
      appId:config.public.appId,
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
      const { players } = roomExists.game
      console.log(players)
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
        console.log('UPDATE Game data', roomId, data)
        playerStore.updatePlayerPosition(data.game.players)

      });
    }

    const startStopGameById = async (roomId, activate = true) => {
      const allRooms = await getRooms()

      const roomExists = allRooms[roomId]
      const { players } = roomExists.game
      console.log(players)

      roomExists.game.isActive = activate

      if (activate) {
        const playerStore = usePlayerStore();

        console.log(roomExists.game.players)

        //Gameready to start
        const playersLength = roomExists.game.players.length
        const randomIndex = Math.floor(Math.random() * playersLength);

        const locationLength = SPY_LOCATIONS.length
        const randomLocationIndex = Math.floor(Math.random() * locationLength);

        console.log(SPY_LOCATIONS[randomLocationIndex])
        const locationData = SPY_LOCATIONS[randomLocationIndex]
        roomExists.game.players.map((v, i) => {
          const randomRoleIndex = Math.floor(Math.random() * locationData.roles.length);
          console.log(locationData.roles)
          v.location = locationData.location
          v.role = locationData.roles[randomRoleIndex]

          if (i === randomIndex) {
            v.isSpy = true
            v.location = 'Secret'
            v.role = 'Spy'
          } else {
            v.isSpy = false
          }

          return v
        })
        console.log(roomExists.game.players)

      }

      if (!!roomExists) {
        set(ref(database, 'rooms/' + roomId), {
          game: roomExists.game
        });
      }
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


      roomExists.game.players = roomExists.game.players.filter(user=> user.username !== userId)

      console.log(roomExists)
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
