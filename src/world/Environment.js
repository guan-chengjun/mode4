import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ASSETS } from '../config.js';

/**
 * 环境模块：
 *  - 地面与站台
 *  - 天空盒纹理（CDN 加载，失败时用程序化渐变天穹兜底）
 *  - GLTF 装饰模型（CDN 加载，失败时用程序化几何体兜底）
 */
export class Environment {
  constructor(stage) {
    this.stage = stage;
    this.scene = stage.scene;

    this._buildGround();
    this._buildPlatform();

    // 异步加载外部资源（均有兜底，不阻塞场景）
    this.skybox = null;
    this.skyDome = null;
    this._loadSkybox();
    this._loadGltfDecor();
  }

  /** 地面：草地色大平面 + 网格参考线 */
  _buildGround() {
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(400, 64),
      new THREE.MeshStandardMaterial({ color: 0x4a7c3f, roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const grid = new THREE.GridHelper(400, 80, 0x3a6132, 0x3f6d37);
    grid.position.y = 0.02;
    this.scene.add(grid);
  }

  /** 站台：起点处的混凝土平台 + 顶棚 */
  _buildPlatform() {
    const mat = new THREE.MeshStandardMaterial({ color: 0x9a9a9a, roughness: 0.9 });
    const platform = new THREE.Mesh(new THREE.BoxGeometry(8, 1.4, 20), mat);
    platform.position.set(4.5, 0.7, 55);
    platform.castShadow = true;
    platform.receiveShadow = true;
    this.scene.add(platform);

    const roofMat = new THREE.MeshStandardMaterial({ color: 0xc23b2e, roughness: 0.6 });
    const roof = new THREE.Mesh(new THREE.BoxGeometry(9, 0.3, 22), roofMat);
    roof.position.set(4.5, 6.5, 55);
    roof.castShadow = true;
    this.scene.add(roof);

    // 顶棚支柱
    const poleGeo = new THREE.CylinderGeometry(0.15, 0.15, 5.8, 8);
    for (const z of [46, 64]) {
      const pole = new THREE.Mesh(poleGeo, mat);
      pole.position.set(7.5, 3.6, z);
      this.scene.add(pole);
    }
  }

  /** 加载天空盒立方体贴图；失败时创建渐变天穹兜底 */
  _loadSkybox() {
    new THREE.CubeTextureLoader()
      .setPath(ASSETS.skyboxBase)
      .load(
        ASSETS.skyboxFiles,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          this.skybox = texture;
          this.scene.background = texture; // 加载成功立即启用
          console.info('[环境] 天空盒加载成功');
        },
        undefined,
        () => {
          console.warn('[环境] 天空盒加载失败，使用渐变天穹兜底');
          this._buildSkyDome();
          this.scene.background = null;
          this.skyDome.visible = true;
        },
      );
  }

  /** 兜底天穹：大球体内表面贴垂直渐变 */
  _buildSkyDome() {
    const geo = new THREE.SphereGeometry(800, 32, 16);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color(0x3a7bd5) },
        bottomColor: { value: new THREE.Color(0xcfe8f5) },
      },
      vertexShader: /* glsl */ `
        varying vec3 vPos;
        void main() {
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        varying vec3 vPos;
        void main() {
          float h = normalize(vPos).y * 0.5 + 0.5;
          gl_FragColor = vec4(mix(bottomColor, topColor, h), 1.0);
        }`,
    });
    this.skyDome = new THREE.Mesh(geo, mat);
    this.skyDome.visible = false; // 默认隐藏，仅兜底时显示
    this.scene.add(this.skyDome);
  }

  /** 加载 GLTF 装饰模型（站台旁的吉祥物）；失败时用几何体雕塑兜底 */
  _loadGltfDecor() {
    new GLTFLoader().load(
      ASSETS.gltfModel,
      (gltf) => {
        const model = gltf.scene;
        model.scale.setScalar(4);
        model.position.set(-10, 0, 62);
        model.traverse((o) => { if (o.isMesh) o.castShadow = true; });
        this.scene.add(model);
        console.info('[环境] GLTF 模型加载成功');
      },
      undefined,
      () => {
        console.warn('[环境] GLTF 模型加载失败，使用几何体雕塑兜底');
        const fallback = new THREE.Mesh(
          new THREE.TorusKnotGeometry(2.2, 0.6, 128, 16),
          new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.3 }),
        );
        fallback.position.set(-10, 3.2, 62);
        fallback.castShadow = true;
        this.scene.add(fallback);
      },
    );
  }

  /** 天气切换时调用：决定使用天空盒还是纯色背景 */
  applyBackground(useSkybox, fallbackColor) {
    if (useSkybox && this.skybox) {
      this.scene.background = this.skybox;
      if (this.skyDome) this.skyDome.visible = false;
    } else if (useSkybox && this.skyDome) {
      // 天空盒未加载成功时，晴天类天气用渐变天穹
      this.scene.background = null;
      this.skyDome.visible = true;
    } else {
      this.scene.background = new THREE.Color(fallbackColor);
      if (this.skyDome) this.skyDome.visible = false;
    }
  }
}
