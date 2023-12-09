import { onUnmounted, ref } from 'vue';

import firebase from '~/plugins/firebase';

export default function useFirebase() {

  const { $firebase } = useNuxtApp();

  return {
    ...$firebase,
  };

}