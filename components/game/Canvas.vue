
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

onMounted(() => {
  // Drawing with text. Ported from Generative Design book - http://www.generative-gestaltung.de - Original licence: http://www.apache.org/licenses/LICENSE-2.0

  // Application variables
  var position = { x: 0, y: window.innerHeight / 2 };
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
    canvas.width = window.innerWidth / 2;
    canvas.height = window.innerHeight / 2;

    canvas.addEventListener("mousemove", mouseMove, false);
    canvas.addEventListener("mousedown", mouseDown, false);
    canvas.addEventListener("mouseup", mouseUp, false);
    canvas.addEventListener("mouseout", mouseUp, false);
    canvas.addEventListener("dblclick", doubleClick, false);

    window.onresize = function (event) {
      canvas.width = window.innerWidth / 2;
      canvas.height = window.innerHeight / 2;
    };

    canvasStartingYPosPx.value = canvasRef.value.getBoundingClientRect().top;
    canvasStartingXPosPx.value = canvasRef.value.getBoundingClientRect().left;
  }

  function mouseMove(event) {
    mouse.x = event.pageX;
    mouse.y = event.pageY;
    draw();
  }

  function draw() {
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
});

const saveDrawData = async () => {
  var dataURL = canvas.toDataURL();

  const roomResponse = await firebase.value.saveDrawing(roomId.value, dataURL);
};
</script>

<template>
  <div class="game-canvas bg-white">
    <canvas v-show="isAdmin" ref="canvasRef" id="canvas"></canvas>
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