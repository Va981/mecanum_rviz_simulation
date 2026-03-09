/**
 * app.js – Lógica de la interfaz mecanum-ui
 *
 * Funcionalidad:
 *  - Conectar a rosbridge (ws://JETSON_IP:9090) mediante ROSLIB.Ros
 *  - Inicializar ROS2D.Viewer y ROS2D.OccupancyGridClient para mostrar el mapa
 *  - Subscribir a /amcl_pose y /odom para mostrar/posicionar NavigationArrow
 *  - Publicar /cmd_vel (geometry_msgs/Twist) al pulsar botones o teclas
 *  - Mostrar estado de conexión
 */

'use strict';

/* ========================================================
   1. Variables globales
   ======================================================== */

let ros = null;
let cmdVelTopic = null;
let viewer = null;
let robotMarker = null;

// Velocidades lineales y angulares configurables
const LINEAR_SPEED   = 0.3;   // m/s  (adelante / atrás / strafe)
const ANGULAR_SPEED  = 0.6;   // rad/s (giro)

/* ========================================================
   2. Elementos del DOM
   ======================================================== */

const connectBtn    = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const jetsonIpInput = document.getElementById('jetsonIp');
const connStatus    = document.getElementById('connStatus');
const logoutBtn     = document.getElementById('logoutBtn');

const dispVx    = document.getElementById('dispVx');
const dispVy    = document.getElementById('dispVy');
const dispVth   = document.getElementById('dispVth');
const poseX     = document.getElementById('poseX');
const poseY     = document.getElementById('poseY');
const poseTheta = document.getElementById('poseTheta');
const teleopWarning = document.getElementById('teleopWarning');

/* ========================================================
   3. Conexión rosbridge
   ======================================================== */

function setStatus(connected, text) {
  connStatus.textContent  = text;
  connStatus.className    = 'status-dot ' + (connected ? 'connected' : 'disconnected');
}

connectBtn.addEventListener('click', function () {
  const ip = jetsonIpInput.value.trim();
  if (!ip) {
    alert('Por favor introduce la IP del Jetson.');
    return;
  }
  initRos('ws://' + ip + ':9090');
});

disconnectBtn.addEventListener('click', function () {
  if (ros) {
    ros.close();
  }
});

logoutBtn.addEventListener('click', function () {
  window.location.href = 'login.html';
});

function initRos(url) {
  if (ros) {
    ros.close();
  }

  setStatus(false, 'Conectando…');
  connectBtn.disabled    = true;
  disconnectBtn.disabled = true;

  ros = new ROSLIB.Ros({ url: url });

  ros.on('connection', function () {
    setStatus(true, 'Conectado – ' + url);
    connectBtn.disabled    = true;
    disconnectBtn.disabled = false;

    initCmdVel();
    initMap();
    initPoseSubscribers();
  });

  ros.on('error', function (error) {
    setStatus(false, 'Error: ' + error);
    connectBtn.disabled    = false;
    disconnectBtn.disabled = true;
  });

  ros.on('close', function () {
    setStatus(false, 'Desconectado');
    connectBtn.disabled    = false;
    disconnectBtn.disabled = true;
    cmdVelTopic = null;
  });
}

/* ========================================================
   4. Publicador /cmd_vel
   ======================================================== */

function initCmdVel() {
  cmdVelTopic = new ROSLIB.Topic({
    ros:          ros,
    name:         '/cmd_vel',
    messageType:  'geometry_msgs/Twist'
  });
}

function publishCmd(vx, vy, vth) {
  if (!cmdVelTopic) {
    teleopWarning.hidden = false;
    return;
  }
  teleopWarning.hidden = true;

  const msg = new ROSLIB.Message({
    linear:  { x: vx,  y: vy,  z: 0.0 },
    angular: { x: 0.0, y: 0.0, z: vth }
  });
  cmdVelTopic.publish(msg);

  dispVx.textContent  = vx.toFixed(2);
  dispVy.textContent  = vy.toFixed(2);
  dispVth.textContent = vth.toFixed(2);
}

function stopRobot() {
  publishCmd(0, 0, 0);
}

/* ========================================================
   5. Mapa 2D (ROS2D)
   ======================================================== */

function initMap() {
  const mapDiv = document.getElementById('map');
  const w = mapDiv.clientWidth  || 600;
  const h = mapDiv.clientHeight || 400;

  // Limpiar si ya había un viewer previo
  mapDiv.innerHTML = '';

  viewer = new ROS2D.Viewer({
    divID:  'map',
    width:  w,
    height: h
  });

  // OccupancyGridClient para mostrar el mapa
  const gridClient = new ROS2D.OccupancyGridClient({
    ros:        ros,
    rootObject: viewer.scene,
    continuous: true
  });

  gridClient.on('change', function () {
    viewer.scaleToDimensions(
      gridClient.currentGrid.width,
      gridClient.currentGrid.height
    );
    viewer.shift(
      gridClient.currentGrid.pose.position.x,
      gridClient.currentGrid.pose.position.y
    );
  });

  // Marcador de navegación para la posición del robot
  robotMarker = new ROS2D.NavigationArrow({
    size:         0.5,
    strokeSize:   0.05,
    fillColor:    createjs.Graphics.getRGB(255, 128, 0, 0.9),
    pulse:        true
  });
  viewer.scene.addChild(robotMarker);
  robotMarker.visible = false;
}

/* ========================================================
   6. Subscribers de pose
   ======================================================== */

function initPoseSubscribers() {
  // /amcl_pose (PoseWithCovarianceStamped)
  const amclSub = new ROSLIB.Topic({
    ros:         ros,
    name:        '/amcl_pose',
    messageType: 'geometry_msgs/PoseWithCovarianceStamped'
  });

  amclSub.subscribe(function (msg) {
    updateRobotPose(
      msg.pose.pose.position.x,
      msg.pose.pose.position.y,
      msg.pose.pose.orientation
    );
  });

  // /odom (Odometry) – fallback cuando no hay AMCL
  const odomSub = new ROSLIB.Topic({
    ros:         ros,
    name:        '/odom',
    messageType: 'nav_msgs/Odometry'
  });

  odomSub.subscribe(function (msg) {
    // Solo actualizamos la UI de pose; el AMCL tiene prioridad para el marcador
    const pos = msg.pose.pose.position;
    const ori = msg.pose.pose.orientation;
    updatePoseDisplay(pos.x, pos.y, quaternionToYaw(ori));
  });
}

function updateRobotPose(x, y, orientation) {
  const yaw = quaternionToYaw(orientation);
  updatePoseDisplay(x, y, yaw);

  if (robotMarker && viewer) {
    robotMarker.visible = true;
    robotMarker.x = x * viewer.pixelsPerMeter;
    robotMarker.y = -y * viewer.pixelsPerMeter;
    robotMarker.rotation = (-yaw * 180) / Math.PI;
  }
}

function updatePoseDisplay(x, y, yaw) {
  poseX.textContent     = x.toFixed(3);
  poseY.textContent     = y.toFixed(3);
  poseTheta.textContent = (yaw * (180 / Math.PI)).toFixed(1) + '°';
}

function quaternionToYaw(q) {
  // Extrae el ángulo yaw (rotación en Z) de un quaternion
  return Math.atan2(
    2.0 * (q.w * q.z + q.x * q.y),
    1.0 - 2.0 * (q.y * q.y + q.z * q.z)
  );
}

/* ========================================================
   7. Botones de teleop
   ======================================================== */

const teleopMap = {
  btnFwd:     { vx:  LINEAR_SPEED,  vy: 0, vth: 0 },
  btnBack:    { vx: -LINEAR_SPEED,  vy: 0, vth: 0 },
  btnLeft:    { vx: 0, vy: 0, vth:  ANGULAR_SPEED },
  btnRight:   { vx: 0, vy: 0, vth: -ANGULAR_SPEED },
  btnStrafeL: { vx: 0, vy:  LINEAR_SPEED, vth: 0 },
  btnStrafeR: { vx: 0, vy: -LINEAR_SPEED, vth: 0 },
  btnStop:    { vx: 0, vy: 0, vth: 0 }
};

Object.entries(teleopMap).forEach(function ([id, cmd]) {
  const btn = document.getElementById(id);
  if (!btn) { return; }

  // Pulsación mantenida: publica mientras se mantiene el botón presionado
  let intervalId = null;

  function startCmd() {
    btn.classList.add('pressed');
    publishCmd(cmd.vx, cmd.vy, cmd.vth);
    if (id !== 'btnStop') {
      intervalId = setInterval(function () {
        publishCmd(cmd.vx, cmd.vy, cmd.vth);
      }, 100);
    }
  }

  function stopCmd() {
    btn.classList.remove('pressed');
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
      stopRobot();
    }
  }

  btn.addEventListener('mousedown',  startCmd);
  btn.addEventListener('mouseup',    stopCmd);
  btn.addEventListener('mouseleave', stopCmd);
  btn.addEventListener('touchstart', function (e) { e.preventDefault(); startCmd(); }, { passive: false });
  btn.addEventListener('touchend',   function (e) { e.preventDefault(); stopCmd();  }, { passive: false });
});

/* ========================================================
   8. Atajos de teclado
   ======================================================== */

const keyMap = {
  ArrowUp:    'btnFwd',
  ArrowDown:  'btnBack',
  ArrowLeft:  'btnLeft',
  ArrowRight: 'btnRight',
  a:          'btnStrafeL',
  A:          'btnStrafeL',
  d:          'btnStrafeR',
  D:          'btnStrafeR',
  ' ':        'btnStop'
};

const pressedKeys = {};

document.addEventListener('keydown', function (e) {
  const btnId = keyMap[e.key];
  if (!btnId || pressedKeys[e.key]) { return; }
  pressedKeys[e.key] = true;

  const btn = document.getElementById(btnId);
  if (btn) {
    btn.dispatchEvent(new Event('mousedown'));
  }
});

document.addEventListener('keyup', function (e) {
  const btnId = keyMap[e.key];
  if (!btnId) { return; }
  delete pressedKeys[e.key];

  const btn = document.getElementById(btnId);
  if (btn) {
    btn.dispatchEvent(new Event('mouseup'));
  }
});
