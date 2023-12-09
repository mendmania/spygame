<script setup>
import { ref } from "vue";

const ws = ref(null);
const messages = ref([]);
const newMessage = ref("");

onMounted(() => {
  useWebSocket();
  // Connect to the WebSocket server
  ws.value = new WebSocket("ws://localhost:3000");

  ws.value.onopen = () => {
    console.log("WebSocket connection opened");
  };

  ws.value.onmessage = (event) => {
    messages.value.push(event.data);
  };

  ws.value.onclose = () => {
    console.log("WebSocket connection closed");
  };

  ws.value.onerror = (error) => {
    console.error(`WebSocket error: ${error}`);
  };

  // Listen for incoming messages
  ws.value.addEventListener("message", (event) => {
    messages.value.push(event.data);
  });

  // Handle disconnection
  ws.value.addEventListener("close", () => {
    console.log("WebSocket disconnected");
  });
});

const sendMessage = () => {
  // Send a message to the WebSocket server
  console.log(ws.value);
  ws.value.send(newMessage.value);
  newMessage.value = "";
};
</script>

<template>
  <div>
    <ul>
      <li v-for="(msg, index) in messages" :key="index">{{ msg }}</li>
    </ul>
    {{ newMessage }}
    <input v-model="newMessage" placeholder="Type a message" />
    <button @click="sendMessage">Send Message</button>
  </div>
</template>
  
