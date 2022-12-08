import destVt from '../glsl/base.vert';
import destFg from '../glsl/dest.frag';
import { Func } from '../core/func';
import { Canvas } from '../webgl/canvas';
import { Object3D } from 'three/src/core/Object3D';
import { Update } from '../libs/update';
import { Mesh } from 'three/src/objects/Mesh';
import { CircleGeometry } from 'three/src/geometries/CircleGeometry';
import { MeshBasicMaterial } from 'three/src/materials/MeshBasicMaterial';
import { PlaneGeometry } from 'three/src/geometries/PlaneGeometry';
import { ShaderMaterial } from 'three/src/materials/ShaderMaterial';
import { Color } from 'three/src/math/Color';
import { Vector3 } from 'three/src/math/Vector3';
import { Capture } from '../webgl/capture';
import { Util } from '../libs/util';
import { Blur } from '../webgl/blur';
import { OrthographicCamera } from 'three/src/cameras/OrthographicCamera';
import { Texture } from 'three/src/textures/Texture';
import { MousePointer } from '../core/mousePointer';


export class Visual extends Canvas {

  private _con:Object3D;
  private _mainCap:Capture;
  private _dest:Mesh;
  private _blur:Array<Blur> = [];
  private _blurCamera:OrthographicCamera;
  private _blurScale:number = 0.1;
  private _list:Array<{mesh:Mesh, noise:number, color:Color}> = [];

  constructor(opt: any) {
    super(opt);

    this._blurCamera = this._makeOrthCamera();
    this._updateOrthCamera(this._blurCamera, 10, 10);

    // ブラーかけるやつ
    for(let i = 0; i < 3; i++) {
      this._blur.push(new Blur());
    }

    this._mainCap = new Capture(2);

    for(let i = 0; i < 12; i++) {
      const col = new Color(Util.instance.random(0,1), Util.instance.random(0,1), Util.instance.random(0,1));
      const m = new Mesh(
        new CircleGeometry(0.5, 64),
        new MeshBasicMaterial({
          transparent: true,
          color: col,
          opacity: 0.5,
        })
      );
      this._mainCap.add(m);

      this._list.push({
        mesh: m,
        noise: Util.instance.random(0, 1),
        color: col,
      })
    }

    this._con = new Object3D();
    this.mainScene.add(this._con);

    this._dest = new Mesh(
      new PlaneGeometry(1, 1),
      new ShaderMaterial({
        vertexShader:destVt,
        fragmentShader:destFg,
        transparent:true,
        uniforms:{
          tCross:{value:this._mainCap.texture(0)},
          tNormal:{value:this._mainCap.texture(1)},
          tEffect:{value:this._blur[this._blur.length - 1].getTexture()},
          mouse:{value:new Vector3()},
          time:{value:0},
        }
      })
    );
    this._con.add(this._dest);

    this._resize();
  }







  protected _update(): void {
    super._update();

    const w = Func.instance.sw();
    const h = Func.instance.sh();

    const mx = MousePointer.instance.easeNormal.x;
    const my = MousePointer.instance.easeNormal.y;

    // this._c += mx * 2;

    const baseRadius = Math.max(w, h) * 0.15;

    const uni = this._getUni(this._dest);
    uni.time.value += 1;
    uni.mouse.value.set(Util.instance.map(mx, 0, 1, -1, 1), Util.instance.map(my, 0, 0.99, -0.5, 0.5));

    const radius = Math.min(w, h) * 0.4 * Util.instance.map(mx, 0.5, 1.25, -1, 1);
    this._list.forEach((val, i) => {
      const radian = Util.instance.radian(this._c + i * (360 / this._mainCap.children.length));
      val.mesh.position.x = Math.sin(radian) * radius;
      val.mesh.position.y = Math.cos(radian) * radius;

      const radian2 = Util.instance.radian(val.noise * 200.0 + this._c * 3);
      let s = baseRadius + Util.instance.map(Math.sin(radian2), 0, baseRadius * 1, -1, 1);
      s *= Util.instance.mix(0.5, 1, val.noise);
      val.mesh.scale.set(s, s, s);
    })

    if (this.isNowRenderFrame()) {
      this._render()
    }
  }


  private _render(): void {
    const w = Func.instance.sw();
    const h = Func.instance.sh();

    // 重なりチェック用 同じ色にしておく
    this._list.forEach((val) => {
      (val.mesh.material as MeshBasicMaterial).opacity = 0.5;
      (val.mesh.material as MeshBasicMaterial).color = new Color(0xff0000);
    });
    this.renderer.setClearColor(0x000000, 0);
    this._mainCap.render(this.renderer, this.cameraOrth, 0);

    // 通常 色戻す
    this._list.forEach((val) => {
      (val.mesh.material as MeshBasicMaterial).opacity = 1;
      (val.mesh.material as MeshBasicMaterial).color = val.color;
    });
    this.renderer.setClearColor(0x111111, 1);
    this._mainCap.render(this.renderer, this.cameraOrth, 1);

    // ブラー適応
    const bw = w * this._blurScale;
    const bh = h * this._blurScale;
    this._blur.forEach((val,i) => {
      const t:Texture = i == 0 ? this._mainCap.texture(1) : this._blur[i-1].getTexture();
      val.render(bw, bh, t, this.renderer, this._blurCamera, 100);
    })

    this.renderer.setClearColor(0xffffff, 1);
    this.renderer.render(this.mainScene, this.cameraOrth);
  }


  public isNowRenderFrame(): boolean {
    return this.isRender && Update.instance.cnt % 1 == 0
  }


  _resize(): void {
    super._resize();

    const w = Func.instance.sw();
    const h = Func.instance.sh();

    this.renderSize.width = w;
    this.renderSize.height = h;

    this._updateOrthCamera(this.cameraOrth, w, h);
    this._updatePersCamera(this.cameraPers, w, h);

    let pixelRatio: number = window.devicePixelRatio || 1;

    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(w, h);
    this.renderer.clear();

    this._updateOrthCamera(this._blurCamera, w * this._blurScale, h * this._blurScale);

    this._mainCap.setSize(w, h, pixelRatio);

    this._dest.scale.set(w, h, 1);
  }
}
