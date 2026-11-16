import * as THREE from 'three';
import { WEATHER_PRESETS } from '../config.js';

/**
 * 天气模块：
 *  - 按预设切换光照、雾效、背景与曝光
 *  - 雨夜附带下雨粒子系统（THREE.Points）
 */
export class Weather {
  constructor(stage, environment) {
    this.stage = stage;
    this.env = environment;
    this.current = 'sunny';

    this._buildRain();
    this.apply('sunny');
  }

  /** 下雨粒子：大范围内随机分布的雨点，每帧下落并循环 */
  _buildRain() {
    const count = 4000;
    const positions = new Float32Array(count * 3);
    this.rainArea = { x: 260, y: 120, z: 260 }; // 雨区范围

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * this.rainArea.x;
      positions[i * 3 + 1] = Math.random() * this.rainArea.y;
      positions[i * 3 + 2] = (Math.random() - 0.5) * this.rainArea.z;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    this.rain = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: 0x9db8d8,
        size: 0.35,
        transparent: true,
        opacity: 0.7,
        sizeAttenuation: true,
      }),
    );
    this.rain.visible = false;
    this.stage.scene.add(this.rain);
  }

  /** 应用指定天气预设 */
  apply(name) {
    const p = WEATHER_PRESETS[name];
    if (!p) return;
    this.current = name;
    const { stage } = this;

    // 太阳（平行光）
    stage.sun.color.set(p.sun.color);
    stage.sun.intensity = p.sun.intensity;
    stage.sun.position.set(...p.sun.position);

    // 半球环境光
    stage.hemi.color.set(p.hemi.sky);
    stage.hemi.groundColor.set(p.hemi.ground);
    stage.hemi.intensity = p.hemi.intensity;

    // 雾效
    if (p.fog) {
      stage.scene.fog = new THREE.Fog(p.fog.color, p.fog.near, p.fog.far);
    } else {
      stage.scene.fog = null;
    }

    // 背景（天空盒 / 天穹 / 纯色）
    this.env.applyBackground(p.useSkybox, p.background);

    // 色调映射曝光
    stage.renderer.toneMappingExposure = p.exposure;

    // 下雨粒子开关
    this.rain.visible = p.rain;
  }

  /** 每帧更新：雨点下落 */
  update(dt) {
    if (!this.rain.visible) return;
    const pos = this.rain.geometry.attributes.position;
    const arr = pos.array;
    const fallSpeed = 55;   // 下落速度
    const windX = 8;        // 横向风力
    for (let i = 0; i < arr.length; i += 3) {
      arr[i] += windX * dt;
      arr[i + 1] -= fallSpeed * dt;
      if (arr[i + 1] < 0) {
        // 落地后回到顶部重新下落
        arr[i] = (Math.random() - 0.5) * this.rainArea.x;
        arr[i + 1] = this.rainArea.y;
        arr[i + 2] = (Math.random() - 0.5) * this.rainArea.z;
      }
    }
    pos.needsUpdate = true;
  }
}
