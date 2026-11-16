import { Stage } from './core/Stage.js';
import { CameraRig } from './core/CameraRig.js';
import { Track } from './world/Track.js';
import { Coaster } from './world/Coaster.js';
import { Environment } from './world/Environment.js';
import { Weather } from './world/Weather.js';
import { ControlPanel } from './ui/ControlPanel.js';
import * as THREE from 'three';

/**
 * 主入口：组装各子系统并驱动渲染循环
 */

// ---------- 初始化 ----------
const stage = new Stage(document.getElementById('app'));
const environment = new Environment(stage);
const track = new Track(stage.scene);
const coaster = new Coaster(stage.scene, track);
const weather = new Weather(stage, environment);
const rig = new CameraRig(stage, coaster);

// ---------- 控制面板 ----------
const panel = new ControlPanel({
  onToggle: () => {
    const running = coaster.toggle();
    return running;
  },
  onLoopChange: (loop) => { coaster.loopMode = loop; },
  onSpeedFactor: (f) => { coaster.speedFactor = f; },
  onCameraMode: (mode) => rig.setMode(mode),
  onFollow: (flag) => rig.setFollow(flag),
  onWireframe: (flag) => track.setWireframe(flag),
  onWeather: (name) => weather.apply(name),
});

// 单圈模式下自动停车后，同步按钮状态（简单轮询即可）
let wasRunning = false;

// ---------- 窗口自适应 ----------
window.addEventListener('resize', () => {
  rig.onResize();
  stage.onResize();
});

// ---------- 隐藏加载提示 ----------
document.getElementById('loading').classList.add('hidden');

// ---------- 渲染循环 ----------
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();

  coaster.update(dt);   // 物理
  rig.update();         // 相机（跟随 / 轨道控制）
  weather.update(dt);   // 天气粒子

  // 速度读数与启停状态同步
  panel.setSpeed(coaster.getSpeed());
  if (coaster.running !== wasRunning) {
    wasRunning = coaster.running;
    panel.setRunning(wasRunning);
  }

  stage.render(rig.camera);
}

animate();
