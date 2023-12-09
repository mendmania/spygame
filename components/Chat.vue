<script setup>
import { ref, onMounted } from "vue";
import useFirebase from "~/composables/useFirebase";

const newMessage = ref("");
const messages = ref([]);
const meni= ref(null)

const sendMessage = () => {
    meni.value.writeUserData('userId', newMessage.value, 'email', 'imageUrl')
};

// Start listening for real-time updates when the component is mounted
onMounted(() => {
    meni.value = useFirebase()
    console.log(meni.value)
    console.log(meni.value.writeUserData)
    meni.value.writeUserData('userId', 'name', 'email', 'imageUrl')
    // meni.value.writeUserData()
//   const { messages, addMessage, listenForMessages, stopListening } =
//     useFirebase();
//   listenForMessages();
});
</script>

<template>
  <div>
    <div>
      <div v-for="(message, index) in messages" :key="index">
        {{ message.text }}
      </div>
      <!-- meni {{ meni }} -->
      <input
        v-model="newMessage"
        @keyup.enter="sendMessage"
        placeholder="Type a message"
      />
    </div>
  </div>
</template>
  
