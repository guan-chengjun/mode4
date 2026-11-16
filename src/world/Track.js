import * as THREE from 'three';

/**
 * 轨道模块：
 *  - 用 CatmullRom 闭合曲线生成含 爬坡 / 俯冲 / 弯道 / 回环 的轨道中心线
 *  - 沿曲线生成左右钢轨（管状几何）与枕木
 *  - 根据轨道高度自动生成支撑立柱
 *  - 预计算 Frenet 标架（切线 / 法线 / 副法线），供车厢定向与物理使用
 */
export class Track {
  constructor(scene) {
    this.group = new THREE.Group();
    this.group.name = 'track';

    // ---------- 1. 构造轨道控制点 ----------
    const pts = [];
    const v = (x, y, z) => pts.push(new THREE.Vector3(x, y, z));

    // 站台（起点，平缓段）
    v(0, 3, 62);
    v(0, 3, 48);
    // 爬坡段（链条提升）
    v(0, 7, 32);
    v(0, 16, 16);
    v(0, 28, 0);
    v(0, 34, -14);          // 坡顶（最高点）
    // 俯冲段
    v(0, 6, -34);
    v(4, 4, -46);
    // 大弯道（向左后方转弯并爬升一点）
    v(22, 7, -54);
    v(42, 10, -48);
    v(56, 9, -32);
    // 回环前的平直加速段（对准回环平面，沿 -x 方向进入）
    v(64, 7, -14);
    v(66, 6, -2);
    // —— 竖直回环：x-y 平面内的圆，圆心 (52, 12, -2)，半径 7 ——
    // 参数方程：从圆底部进入，沿行进方向（-x）逆时针绕一整圈
    const cx = 52, cy = 12, cz = -2, R = 7;
    for (let a = 0; a <= 360; a += 30) {
      const rad = THREE.MathUtils.degToRad(a);
      pts.push(new THREE.Vector3(
        cx - R * Math.sin(rad),
        cy - R * Math.cos(rad),
        cz,
      ));
    }
    // 回环出口，继续向前
    v(36, 6, 4);
    // S 形弯道返回站台
    v(24, 6, 22);
    v(30, 5, 44);
    v(14, 4, 58);

    // 闭合样条曲线
    this.curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.5);
    this.length = this.curve.getLength();

    // ---------- 2. 预计算 Frenet 标架（用于车厢姿态，回环处不翻车） ----------
    this.frameSegments = 1000;
    this.frames = this.curve.computeFrenetFrames(this.frameSegments, true);

    // ---------- 3. 找到最高点对应的参数 u（链条提升区终点） ----------
    this.uTop = 0;
    let maxY = -Infinity;
    for (let i = 0; i <= this.frameSegments; i++) {
      const p = this.curve.getPointAt(i / this.frameSegments);
      if (p.y > maxY) { maxY = p.y; this.uTop = i / this.frameSegments; }
    }

    // ---------- 4. 生成钢轨 / 枕木 / 支架 ----------
    this._buildRails();
    this._buildSleepers();
    this._buildSupports();

    scene.add(this.group);
  }

  /** 按参数 u 采样位置 / 切线 / 法线（u ∈ [0,1)） */
  sampleFrame(u) {
    const t = ((u % 1) + 1) % 1;
    const idx = Math.min(Math.floor(t * this.frameSegments), this.frameSegments - 1);
    return {
      position: this.curve.getPointAt(t),
      tangent: this.frames.tangents[idx].clone(),
      normal: this.frames.normals[idx].clone(),
      binormal: this.frames.binormals[idx].clone(),
    };
  }

  /** 左右钢轨：沿中心线按副法线方向偏移后生成管状几何 */
  _buildRails() {
    const gauge = 1.2;             // 轨距
    const samples = 600;
    const leftPts = [];
    const rightPts = [];

    for (let i = 0; i < samples; i++) {
      const u = i / samples;
      const { position, binormal } = this.sampleFrame(u);
      leftPts.push(position.clone().addScaledVector(binormal, gauge / 2));
      rightPts.push(position.clone().addScaledVector(binormal, -gauge / 2));
    }

    const railMat = new THREE.MeshStandardMaterial({
      color: 0xb8bec6, metalness: 0.9, roughness: 0.35,
    });

    for (const pts of [leftPts, rightPts]) {
      const railCurve = new THREE.CatmullRomCurve3(pts, true);
      const geo = new THREE.TubeGeometry(railCurve, 600, 0.09, 8, true);
      const rail = new THREE.Mesh(geo, railMat);
      rail.castShadow = true;
      this.group.add(rail);
    }
  }

  /** 枕木：沿轨道等距放置的横向短梁 */
  _buildSleepers() {
    const count = 160;
    const geo = new THREE.BoxGeometry(1.8, 0.12, 0.35);
    const mat = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.9 });
    // 使用 InstancedMesh 提升性能
    const inst = new THREE.InstancedMesh(geo, mat, count);
    inst.castShadow = true;

    const m = new THREE.Matrix4();
    const basis = new THREE.Matrix4();
    for (let i = 0; i < count; i++) {
      const u = i / count;
      const { position, tangent, normal, binormal } = this.sampleFrame(u);
      // 构造朝向：x=副法线(横向)，y=法线(上)，z=切线(前)
      basis.makeBasis(binormal, normal, tangent);
      m.copy(basis).setPosition(position);
      inst.setMatrixAt(i, m);
    }
    this.group.add(inst);
  }

  /** 支撑立柱：轨道高于地面一定阈值时，自动生成从地面到轨道的钢柱 */
  _buildSupports() {
    const mat = new THREE.MeshStandardMaterial({ color: 0x8a4a3a, roughness: 0.6, metalness: 0.4 });
    const step = 14; // 每隔多少个采样点立一根柱
    const total = 400;

    for (let i = 0; i < total; i += step) {
      const u = i / total;
      const { position } = this.sampleFrame(u);
      const h = position.y - 0.4;
      if (h < 2.5) continue; // 贴地段不需要支架

      const geo = new THREE.CylinderGeometry(0.22, 0.3, h, 8);
      const pole = new THREE.Mesh(geo, mat);
      pole.position.set(position.x, h / 2, position.z);
      pole.castShadow = true;
      this.group.add(pole);

      // 柱顶加一小段横撑，视觉上托住轨道
      const cap = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.18, 0.18), mat);
      cap.position.set(position.x, h + 0.1, position.z);
      this.group.add(cap);
    }
  }

  /** 线框模式切换（查看轨道骨架） */
  setWireframe(flag) {
    this.group.traverse((obj) => {
      if (obj.isMesh && obj.material) obj.material.wireframe = flag;
    });
  }
}
