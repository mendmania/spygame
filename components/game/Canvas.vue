
<script setup>
import { ref } from "vue";

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
const canvasStartingYPosPx = ref(null);
const canvasStartingXPosPx = ref(null);

const canvas = ref(null);
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

  function init() {
    canvas = document.getElementById("canvas");
    context = canvas.getContext("2d");
    console.log(window.innerWidth, window.innerHeight)
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight / 2;

    canvas.addEventListener("mousemove", mouseMove, false);
    canvas.addEventListener("mousedown", mouseDown, false);
    canvas.addEventListener("touchstart", mouseDown, false);
    canvas.addEventListener("touchend", mouseUp, false);
    canvas.addEventListener("mouseup", mouseUp, false);
    canvas.addEventListener("mouseout", mouseUp, false);
    canvas.addEventListener("dblclick", doubleClick, false);

    canvas.addEventListener(
      "touchmove",
      function (e) {
        console.log(e.touches[0].pageX)
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
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    canvasStartingYPosPx.value = canvasRef.value.getBoundingClientRect().top;
    canvasStartingXPosPx.value = canvasRef.value.getBoundingClientRect().left;
  }

  function mouseMove(event) {

    console.log(event.pageX)
    mouse.x = event.pageX;
    mouse.y = event.pageY;
    draw();
  }

  function draw() {
    console.log(mouse.down)
    if (mouse.down) {
      console.log(canvasStartingYPosPx.value);

      var positionX = position.x
      var positionY = position.y - canvasStartingYPosPx.value;

      position.x = mouse.x;
      position.y = mouse.y;

      if (positionX !== null && positionY !== null) {
        context.beginPath();
        context.moveTo(positionX, positionY);
        context.lineTo(
          position.x,
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
    console.log(event)
    mouse.down = true;
    position.x = event.pageX;
    position.y = event.pageY;

    // document.getElementById("info").style.display = "none";
  }

  function mouseUp(event) {
    mouse.down = false;

    console.log("mouseUp");
    saveDrawData();
  }

  const doubleClick = async (event) => {
    canvas.width = canvas.width;

    const roomResponse = await firebase.value.saveDrawing(roomId.value, "meni");
  };

  function textWidth(string, size) {
    context.font = size + "px Georgia";

    if (context.fillText) {
      return context.measureText(string).width;
    } else if (context.mozDrawText) {
      return context.mozMeasureText(string);
    }
  }

  init();

  // const startDrawing = (e) => {
  //   console.log(e);
  //   drawing.value = true;
  //   [lastX.value, lastY.value] = getCursorPosition(e);
  // };

  // const draww = (e) => {
  //   console.log(e);
  //   if (!drawing.value) return;

  //   const [x, y] = getCursorPosition(e);

  //   context.value.beginPath();
  //   context.value.moveTo(lastX.value, lastY.value);
  //   context.value.lineTo(x, y);
  //   context.value.stroke();

  //   [lastX.value, lastY.value] = [x, y];
  // };
  // const endDrawing = () => {
  //   drawing.value = false;
  // };
  // const getCursorPosition = (e) => {
  //   const rect = canvas.value.getBoundingClientRect();
  //   const touch = e.touches ? e.touches[0] : e;
  //   const x = touch.clientX - rect.left;
  //   const y = touch.clientY - rect.top;
  //   return [x, y];
  // };
});

const saveDrawData = async () => {
  var dataURL = canvas.toDataURL();

  const roomResponse = await firebase.value.saveDrawing(roomId.value, dataURL);
};
</script>

<template>
  <div class="game-canvas bg-white">
    <canvas
      v-show="isAdmin"
      ref="canvasRef"
      id="canvas"
    ></canvas>

    <!-- <canvas
      ref="canvas"
      @touchstart="startDrawing"
      @touchmove="draww"
      @touchend="endDrawing"
      @mousedown="startDrawing"
      @mousemove="draww"
      @mouseup="endDrawing"
      @mouseleave="endDrawing"
    ></canvas> -->
    <img v-show="!isAdmin" :src="gameData.game.drawData" />
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