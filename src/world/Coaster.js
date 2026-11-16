import * as THREE from 'three';
import { PHYSICS } from '../config.js';

/**
 * 过山车模块：
 *  - 多节车厢沿轨道按弧长串联
 *  - 重力物理：上坡减速、下坡加速（沿切线方向投影重力）
 *  - 爬坡段模拟链条提升机，保证列车能越过坡顶
 *  - 支持 启停 / 速度倍率 / 单圈与循环运行
 */
export class Coaster {
  constructor(scene, track) {
    this.track = track;

    // 运行状态
    this.running = false;   // 是否运行中
    this.loopMode = true;   // 到站台后是否循环
    this.speedFactor = 1.0; // 界面调速倍率

    // 物理状态
    this.u = 0;             // 车头在轨道上的归一化弧长参数 [0,1)
    this.v = 0;             // 沿轨道的标量速度 m/s（可为负，表示倒退）

    // 车厢编组
    this.carCount = 4;
    this.carSpacing = 2.6;  // 车厢间距（米）
    this.cars = [];
    this._buildCars();
    scene.add(this.group);
  }

  /** 程序化构建车厢（不依赖外部模型，永远可用） */
  _buildCars() {
    this.group = new THREE.Group();
    this.group.name = 'coaster';

    const bodyColors = [0xd23c2e, 0xe8a13a, 0x3a7bd5, 0x3aa655];
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5, metalness: 0.6 });

    for (let i = 0; i < this.carCount; i++) {
      const car = new THREE.Group();

      // 车体
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.7, 2.2),
        new THREE.MeshStandardMaterial({ color: bodyColors[i % bodyColors.length], roughness: 0.4, metalness: 0.3 }),
      );
      body.position.y = 0.75;
      body.castShadow = true;
      car.add(body);

      // 座椅靠背
      const seat = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.6, 0.25),
        new THREE.MeshStandardMaterial({ color: 0x333944, roughness: 0.8 }),
      );
      seat.position.set(0, 1.25, -0.6);
      car.add(seat);

      // 四个轮子
      const wheelGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.12, 16);
      wheelGeo.rotateZ(Math.PI / 2); // 轮轴沿 x 方向
      for (const [x, z] of [[-0.6, 0.7], [0.6, 0.7], [-0.6, -0.7], [0.6, -0.7]]) {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.position.set(x, 0.22, z);
        car.add(wheel);
      }

      this.group.add(car);
      this.cars.push(car);
    }
  }

  /** 启动 / 停止切换 */
  toggle() {
    this.running = !this.running;
    return this.running;
  }

  /** 每帧物理更新 */
  update(dt) {
    if (!this.running) return;

    // 调速倍率：等效于缩放物理步长
    const sdt = Math.min(dt, 0.05) * this.speedFactor;

    // 车头处切线（单位向量），其 y 分量即坡度正弦
    const { tangent } = this.track.sampleFrame(this.u);

    // 重力沿轨道切线的投影：上坡 (tangent.y>0) 减速，下坡加速
    let a = -PHYSICS.gravity * tangent.y;

    // 摩擦 / 风阻（与速度反向）
    a -= PHYSICS.friction * this.v;

    // 爬坡段链条提升机：在坡底到坡顶之间，若速度不足则链条牵引
    if (this.u > 0.001 && this.u < this.track.uTop && this.v < PHYSICS.liftSpeed) {
      a = Math.max(a, PHYSICS.liftAccel);
    }

    this.v += a * sdt;
    // 位移 = 速度 × 时间，换算成归一化弧长参数
    this.u += (this.v * sdt) / this.track.length;

    // 处理绕圈
    if (this.u >= 1) {
      if (this.loopMode) {
        this.u -= 1; // 循环：直接绕回起点
      } else {
        // 单圈模式：回到站台停车
        this.u = 0;
        this.v = 0;
        this.running = false;
      }
    } else if (this.u < 0) {
      this.u += 1; // 倒退时同样环绕
    }

    this._layoutCars();
  }

  /** 按车头参数依次排布各节车厢 */
  _layoutCars() {
    const du = this.carSpacing / this.track.length; // 车厢间距对应的参数差
    for (let i = 0; i < this.carCount; i++) {
      const u = ((this.u - i * du) % 1 + 1) % 1;
      const { position, tangent, normal, binormal } = this.track.sampleFrame(u);
      const car = this.cars[i];
      car.position.copy(position);
      // 用轨道标架构造车厢朝向：x=副法线，y=法线，z=切线（回环时自动翻转）
      const basis = new THREE.Matrix4().makeBasis(binormal, normal, tangent);
      car.quaternion.setFromRotationMatrix(basis);
    }
  }

  /** 供相机跟随使用：车头位置与朝向标架 */
  getLeadCarFrame() {
    return this.track.sampleFrame(this.u);
  }

  /** 当前速度（km/h 显示用，这里直接返回 m/s） */
  getSpeed() {
    return this.running ? Math.abs(this.v) : 0;
  }
}
