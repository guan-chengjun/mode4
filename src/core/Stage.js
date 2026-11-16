import * as THREE from 'three';

/**
 * 舞台：封装渲染器、场景与灯光（太阳平行光 + 半球环境光）
 */
export class Stage {
  constructor(container) {
    // 渲染器
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // 柔和阴影
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    container.appendChild(this.renderer.domElement);

    // 场景
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87b5e0);

    // 太阳（平行光，投射阴影）
    this.sun = new THREE.DirectionalLight(0xffffff, 3.0);
    this.sun.position.set(80, 120, 60);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    // 阴影相机范围覆盖整个轨道区域
    const s = 120;
    Object.assign(this.sun.shadow.camera, {
      left: -s, right: s, top: s, bottom: -s, near: 10, far: 400,
    });
    this.sun.shadow.bias = -0.0005;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    // 半球环境光（天空色 / 地面反照）
    this.hemi = new THREE.HemisphereLight(0xbfd9ff, 0x8a7a5a, 0.9);
    this.scene.add(this.hemi);
  }

  render(camera) {
    this.renderer.render(this.scene, camera);
  }

  onResize(camera) {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
