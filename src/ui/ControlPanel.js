/**
 * 控制面板：绑定 DOM 事件，把用户操作转发给各子系统
 */
export class ControlPanel {
  /**
   * @param {Object} handlers 各子系统回调
   * @param {() => boolean} handlers.onToggle 启停切换，返回最新运行状态
   * @param {(loop: boolean) => void} handlers.onLoopChange
   * @param {(factor: number) => void} handlers.onSpeedFactor
   * @param {(mode: 'persp'|'ortho') => void} handlers.onCameraMode
   * @param {(follow: boolean) => void} handlers.onFollow
   * @param {(wire: boolean) => void} handlers.onWireframe
   * @param {(weather: string) => void} handlers.onWeather
   */
  constructor(handlers) {
    this.h = handlers;
    const $ = (id) => document.getElementById(id);

    // 启停按钮
    this.btnToggle = $('btn-toggle');
    this.btnToggle.addEventListener('click', () => {
      const running = this.h.onToggle();
      this.setRunning(running);
    });

    // 循环运行
    $('chk-loop').addEventListener('change', (e) => this.h.onLoopChange(e.target.checked));

    // 速度倍率
    this.speedFactorText = $('speed-factor-text');
    $('speed-factor').addEventListener('input', (e) => {
      const f = parseFloat(e.target.value);
      this.speedFactorText.textContent = `${f.toFixed(1)}×`;
      this.h.onSpeedFactor(f);
    });

    // 相机模式切换
    this.btnPersp = $('btn-cam-persp');
    this.btnOrtho = $('btn-cam-ortho');
    this.btnPersp.addEventListener('click', () => this._setCamMode('persp'));
    this.btnOrtho.addEventListener('click', () => this._setCamMode('ortho'));

    // 跟随视角 / 线框
    $('chk-follow').addEventListener('change', (e) => this.h.onFollow(e.target.checked));
    $('chk-wireframe').addEventListener('change', (e) => this.h.onWireframe(e.target.checked));

    // 天气按钮组
    this.weatherBtns = [...document.querySelectorAll('.weather-btn')];
    for (const btn of this.weatherBtns) {
      btn.addEventListener('click', () => {
        this.weatherBtns.forEach((b) => b.classList.toggle('active', b === btn));
        this.h.onWeather(btn.dataset.weather);
      });
    }

    this.speedText = $('speed-text');
  }

  _setCamMode(mode) {
    this.btnPersp.classList.toggle('active', mode === 'persp');
    this.btnOrtho.classList.toggle('active', mode === 'ortho');
    this.h.onCameraMode(mode);
  }

  /** 同步启停按钮外观 */
  setRunning(running) {
    this.btnToggle.textContent = running ? '⏸ 停止' : '▶ 启动';
  }

  /** 每帧刷新速度读数 */
  setSpeed(v) {
    this.speedText.textContent = v.toFixed(1);
  }
}
