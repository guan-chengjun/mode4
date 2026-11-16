/**
 * 全局配置：天气预设、物理常量、资源地址
 */

// 各天气的光照 / 雾效 / 色调预设
export const WEATHER_PRESETS = {
  sunny: {
    label: '晴天',
    useSkybox: true,               // 使用天空盒纹理
    background: 0x87b5e0,          // 天空盒加载失败时的兜底背景色
    sun: { color: 0xffffff, intensity: 3.2, position: [80, 120, 60] },
    hemi: { sky: 0xbfd9ff, ground: 0x8a7a5a, intensity: 0.9 },
    fog: null,                     // 无雾
    rain: false,
    exposure: 1.0,
  },
  cloudy: {
    label: '阴天',
    useSkybox: true,
    background: 0x9aa5ad,
    sun: { color: 0xdde3e8, intensity: 1.2, position: [60, 100, 40] },
    hemi: { sky: 0xaeb8c0, ground: 0x6a6a62, intensity: 0.7 },
    fog: { color: 0x9aa5ad, near: 80, far: 420 },
    rain: false,
    exposure: 0.95,
  },
  dusk: {
    label: '黄昏',
    useSkybox: false,
    background: 0x3a2340,
    sun: { color: 0xff8c42, intensity: 1.8, position: [-120, 28, 40] }, // 低角度夕阳
    hemi: { sky: 0xd96a4a, ground: 0x2e2033, intensity: 0.5 },
    fog: { color: 0x53304a, near: 60, far: 380 },
    rain: false,
    exposure: 1.05,
  },
  rainy: {
    label: '雨夜',
    useSkybox: false,
    background: 0x0a0f1c,
    sun: { color: 0x7d90b8, intensity: 0.45, position: [40, 90, -30] }, // 微弱月光
    hemi: { sky: 0x22304a, ground: 0x0c1018, intensity: 0.25 },
    fog: { color: 0x0a0f1c, near: 30, far: 220 },
    rain: true,                    // 开启下雨粒子
    exposure: 0.9,
  },
  night: {
    label: '夜晚',
    useSkybox: false,
    background: 0x05070f,
    sun: { color: 0xaabbee, intensity: 0.6, position: [-50, 110, -60] }, // 月光
    hemi: { sky: 0x1a2440, ground: 0x05070c, intensity: 0.2 },
    fog: { color: 0x05070f, near: 90, far: 500 },
    rain: false,
    exposure: 0.95,
  },
};

// 物理常量
export const PHYSICS = {
  gravity: 9.8,        // 重力加速度 m/s²
  friction: 0.12,      // 摩擦 / 风阻系数（按速度线性衰减）
  liftSpeed: 7.0,      // 爬坡链条提升到的目标速度 m/s
  liftAccel: 4.0,      // 链条提升加速度 m/s²
};

// 在线资源地址（加载失败时均有几何体 / 纯色兜底）
export const ASSETS = {
  // 天空盒立方体贴图（jsdelivr 镜像的 three.js 官方示例纹理）
  skyboxBase: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/textures/cube/Bridge2/',
  skyboxFiles: ['posx.jpg', 'negx.jpg', 'posy.jpg', 'negy.jpg', 'posz.jpg', 'negz.jpg'],
  // GLTF 装饰模型（Khronos 官方示例鸭子）
  gltfModel: 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@main/2.0/Duck/glTF-Binary/Duck.glb',
};
