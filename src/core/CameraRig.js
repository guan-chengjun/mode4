import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/**
 * 相机系统：
 *  - 透视 / 正交双相机切换
 *  - OrbitControls 自由拖拽缩放
 *  - 跟随车厢视角（车头后上方跟拍）
 */
export class CameraRig {
  constructor(stage, coaster) {
    this.stage = stage;
    this.coaster = coaster;
    this.follow = false;

    const aspect = window.innerWidth / window.innerHeight;

    // 透视相机
    this.persp = new THREE.PerspectiveCamera(60, aspect, 0.1, 2000);
    this.persp.position.set(90, 55, 110);

    // 正交相机（视野大小 viewSize 决定缩放级别）
    this.viewSize = 70;
    this.ortho = this._makeOrtho(aspect);
    this.ortho.position.copy(this.persp.position);

    this.camera = this.persp;
    this._createControls();
  }

  _makeOrtho(aspect) {
    const d = this.viewSize;
    return new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 0.1, 2000);
  }

  _createControls() {
    this.controls = new OrbitControls(this.camera, this.stage.renderer.domElement);
    this.controls.enableDamping = true;   // 阻尼让拖拽更顺滑
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI * 0.495; // 不允许钻到地面以下
    this.controls.maxDistance = 600;
    this.controls.target.set(0, 10, 0);
  }

  /** 切换 透视 / 正交 */
  setMode(mode) {
    const target = this.controls.target.clone();
    const pos = this.camera.position.clone();
    const quat = this.camera.quaternion.clone();

    this.camera = mode === 'ortho' ? this.ortho : this.persp;
    this.camera.position.copy(pos);
    this.camera.quaternion.copy(quat);

    // 重建控制器绑定到新相机
    this.controls.dispose();
    this._createControls();
    this.controls.target.copy(target);
    this.controls.update();
  }

  /** 开关跟随车厢视角 */
  setFollow(flag) {
    this.follow = flag;
    this.controls.enabled = !flag; // 跟随时禁用鼠标轨道控制
  }

  /** 每帧更新：跟随模式下把相机挂到车头后上方 */
  update() {
    if (!this.follow) {
      this.controls.update();
      return;
    }
    const { position, tangent, normal } = this.coaster.getLeadCarFrame();
    // 相机位置：车厢后方 8m、上方 3.5m
    const camPos = position.clone()
      .addScaledVector(tangent, -8)
      .addScaledVector(normal, 3.5);
    this.camera.position.lerp(camPos, 0.35); // 平滑跟随
    // 注视点：车头前方 12m
    const lookAt = position.clone().addScaledVector(tangent, 12);
    this.camera.up.copy(normal); // 回环时相机一起翻转
    this.camera.lookAt(lookAt);
  }

  onResize() {
    const aspect = window.innerWidth / window.innerHeight;
    this.persp.aspect = aspect;
    this.persp.updateProjectionMatrix();
    const d = this.viewSize;
    Object.assign(this.ortho, {
      left: -d * aspect, right: d * aspect, top: d, bottom: -d,
    });
    this.ortho.updateProjectionMatrix();
  }
}
