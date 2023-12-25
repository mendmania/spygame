
<script setup>
import { ref } from "vue";
import { getHeightBasedOnWidth } from "~/utils/getHeightBasedOnWidth";

import useFirebase from "~/composables/useFirebase";

const props = defineProps({
  location: {
    type: String,
    required: false,
    default: "Unknown",
  },
  role: {
    type: [String, Number],
    required: false,
    default: -1,
  },
  isAdmin: {
    type: Boolean,
    required: false,
    default: false,
  },
  gameData: {
    type: Object,
    required: false,
    default: null,
  },
});

const firebase = ref(useFirebase());
const router = useRouter();

const currentRoute = router.currentRoute;
const routeData = ref(currentRoute);
const roomId = ref(routeData.value.params.roomId[0]);

const canvasRef = ref(null);
const imgRef = ref(null);
const canvasStartingYPosPx = ref(null);
const canvasStartingXPosPx = ref(null);
const history = ref([]);

// const canvas = ref(null);
const drawiong = ref(false);
const lastX = ref(0);
const lastY = ref(0);

onMounted(() => {
  // Drawing with text. Ported from Generative Design book - http://www.generative-gestaltung.de - Original licence: http://www.apache.org/licenses/LICENSE-2.0

  // Application variables
  var position = { x: 0, y: window.innerHeight };
  var counter = 0;
  var minFontSize = 3;
  var angleDistortion = 0;
  var letters =
    "There was a table set out under a tree in front of the house, and the March Hare and the Hatter were having tea at it: a Dormouse was sitting between them, fast asleep, and the other two were using it as a cushion, resting their elbows on it, and talking over its head. 'Very uncomfortable for the Dormouse,' thought Alice; 'only, as it's asleep, I suppose it doesn't mind.'";

  // Drawing variables
  var canvas;
  var context;
  var mouse = { x: 0, y: 0, down: false };

  const setCanvasDimensions = () => {
    const width = document.querySelector(".game-canvas").clientWidth;
    const height = getHeightBasedOnWidth(width);
    console.log(window.innerWidth, window.innerHeight);
    console.log(width);
    console.log(height);

    imgRef.value.style.width = `${width}px`;
    imgRef.value.style.height = `${height}px`;
    canvas.width = width;
    canvas.height = height;
  };

  function init() {
    canvas = document.getElementById("canvas");
    context = canvas.getContext("2d");
    setCanvasDimensions();

    canvas.addEventListener("mousemove", mouseMove, false);
    canvas.addEventListener("mousedown", mouseDown, false);
    canvas.addEventListener("touchstart", mouseDown, false);
    canvas.addEventListener("touchend", mouseUp, false);
    canvas.addEventListener("mouseup", mouseUp, false);
    // canvas.addEventListener("mouseout", mouseUp, false);
    canvas.addEventListener("dblclick", doubleClick, false);

    canvas.addEventListener(
      "touchmove",
      function (e) {
        console.log(e.touches[0].pageX);
        var touch = e.touches[0];
        var mouseEvent = new MouseEvent("mousemove", {
          clientX: touch.clientX,
          clientY: touch.clientY,
        });
        canvas.dispatchEvent(mouseEvent);
      },
      false
    );

    window.onresize = function (event) {
      console.log(window.innerWidth);
      setCanvasDimensions();

      // canvas.width = window.innerWidth;
      // canvas.height = window.innerHeight;
    };

    canvasStartingYPosPx.value = canvasRef.value.getBoundingClientRect().top;
    canvasStartingXPosPx.value = canvasRef.value.getBoundingClientRect().left;

    loadDrawingOnCanvas(props.gameData.game.drawData);
  }

  function mouseMove(event) {
    console.log(event.pageX);
    mouse.x = event.pageX;
    mouse.y = event.pageY;
    draw();
  }

  function draw() {
    console.log(mouse.down);
    if (mouse.down) {
      console.log(canvasStartingYPosPx.value);

      var positionX = position.x - canvasStartingXPosPx.value;
      var positionY = position.y - canvasStartingYPosPx.value;

      position.x = mouse.x;
      position.y = mouse.y;

      if (positionX !== null && positionY !== null) {
        context.beginPath();
        context.moveTo(positionX, positionY);
        context.lineTo(
          position.x - canvasStartingXPosPx.value,
          position.y - canvasStartingYPosPx.value
        );
        context.stroke();
      }
    }
    // if (mouse.down) {
    //   var d = distance(position, mouse);
    //   var fontSize = minFontSize + d / 2;
    //   var letter = letters[counter];
    //   var stepSize = textWidth(letter, fontSize);

    //   if (d > stepSize) {
    //     var angle = Math.atan2(mouse.y - position.y, mouse.x - position.x);

    //     context.font = fontSize + "px Georgia";

    //     context.save();
    //     context.translate(position.x, position.y);
    //     context.rotate(angle);
    //     context.fillText(letter, 0, 0);
    //     context.restore();
    //     context.stroke();

    //     counter++;
    //     if (counter > letters.length - 1) {
    //       counter = 0;
    //     }

    //     //console.log (position.x + Math.cos( angle ) * stepSize)
    //     position.x = position.x + Math.cos(angle) * stepSize;
    //     position.y = position.y + Math.sin(angle) * stepSize;
    //   }
    // }
  }

  function distance(pt, pt2) {
    var xs = 0;
    var ys = 0;

    xs = pt2.x - pt.x;
    xs = xs * xs;

    ys = pt2.y - pt.y;
    ys = ys * ys;

    return Math.sqrt(xs + ys);
  }

  function mouseDown(event) {
    event.preventDefault();
    event.stopPropagation();
    console.log(event);
    mouse.down = true;
    position.x = event.pageX;
    position.y = event.pageY;

    // document.getElementById("info").style.display = "none";
  }

  function mouseUp(event) {
    mouse.down = false;

    saveDrawData();
  }

  const doubleClick = async (event) => {
    console.log("clear");
    clearCanvas();
  };

  // function textWidth(string, size) {
  //   context.font = size + "px Georgia";

  //   if (context.fillText) {
  //     return context.measureText(string).width;
  //   } else if (context.mozDrawText) {
  //     return context.mozMeasureText(string);
  //   }
  // }

  init();
});

const clearCanvas = async () => {
  canvas.width = canvas.width;
  let dataURL = canvas.toDataURL();
  const roomResponse = await firebase.value.saveDrawing(roomId.value, dataURL);

  emptyUndoQueue();
};

const emptyUndoQueue = () => {
  history.value = [];
};

const saveDrawData = async () => {
  const dataURL = canvas.toDataURL();

  history.value.push(dataURL);
  const roomResponse = await firebase.value.saveDrawing(roomId.value, dataURL);
};

const undoDrawing = () => {
  const [lastS] = history.value;
  console.log(history.value.length);
  console.log(lastS);
  history.value.pop(); // Remove the current state

  if (history.value.length > 0) {
    let lastState = history.value[history.value.length - 1];
    loadDrawingOnCanvas(lastState);
    // let img = new Image();
    // img.src = lastState;
    // console.log(lastState);

    // img.onload = function () {
    //   ctx.clearRect(0, 0, canvas.width, canvas.height);
    //   ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    // };
  } else if (history.value.length === 0) {
    clearCanvas();
  } else {
    emptyUndoQueue();
  }
};

const loadDrawingOnCanvas = (data) => {
  const ctx = canvas.getContext("2d");

  let img = new Image();
  img.src = data;
  console.log(data);

  img.onload = function () {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  };

  const dataURL = canvas.toDataURL();

  const roomResponse = firebase.value.saveDrawing(roomId.value, dataURL);
};
</script>

<template>
  <div class="game-canvas bg-blue-800 container max-w-[800px] w-full">
    <GameInfoCard :text="gameData?.game.roomId" :clearCanvas="clearCanvas">
      <template #left>
        <button
          class="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded mx-2"
          @click="undoDrawing"
        >
          Undo
        </button>
      </template>
      <template #right>
        <button
          class="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded mx-2"
          @click="clearCanvas"
        >
          Clear
        </button>
      </template>
    </GameInfoCard>

    <canvas
      v-show="isAdmin"
      ref="canvasRef"
      id="canvas"
      class="bg-white"
    ></canvas>

    <img
      v-show="!isAdmin"
      ref="imgRef"
      class="w-full h-full bg-white"
      :src="gameData.game.drawData"
    />
  </div>
</template>


<style lang="scss" scoped>
html,
body {
  width: 100%;
  height: 100%;
  margin: 0px;
  overflow: hidden;

  &:hover {
    span {
      display: none;
    }
  }
}

canvas {
  cursor: crosshair;
}

span {
  font-family: "Georgia", cursive;
  font-size: 40px;
  position: fixed;
  top: 50%;
  left: 50%;
  color: #000;
  margin-top: -40px;
  margin-left: -200px;
}
</style>