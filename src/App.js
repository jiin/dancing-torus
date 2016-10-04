import dat from 'dat-gui'
import Stats from 'stats-js'
import THREE from 'three'

const OrbitControls  = require('three-orbit-controls')(THREE);
const Clubber        = require('clubber');
const glslify        = require('glslify');
const soundcloud     = require('soundcloud-badge');
const sweetalert     = require('sweetalert');

var fragment = glslify('./glsl/basic_frag.glsl');
var vertex = glslify('./glsl/basic_vert.glsl');

require('./post-processing/EffectComposer')(THREE);

class App {

  constructor()
  {
    this.renderer = null;
    this.camera   = null;
    this.scene    = null;
    this.audio    = null;
    this.counter  = 0;
    this.clock    = new THREE.Clock();
    this.DEBUG    = true;
    this.SIZE     = {
      w  : window.innerWidth ,
      w2 : window.innerWidth / 2,
      h  : window.innerHeight,
      h2 : window.innerHeight / 2
    };

    this.MOUSE = {
      x : 0,
      y : 0 
    };

    this.SONG_URL = 'https://soundcloud.com/ahmed-marshal/dubfx-love-someone';

    this.initSoundCloud(this.SONG_URL);

    this.startStats();
    this.createRender();
    this.createScene();
    this.addComposer();
    this.addObjects();

    this.onResize();
    this.update();
  }

  initSoundCloud(song)
  {

    let init = this.audio == null;

    if (!init) {
      document.getElementsByClassName('npm-scb-white')[0].remove();
    }

    soundcloud({
      client_id: 'ded451c6d8f9ff1c62f72523f49dab68',
      song: song,
      dark: false,
      getFonts: false
    }, (err, src, data, div) => {

      if (err) throw err;

      if (init) {
        this.audio = document.createElement('audio');
      } else {
        this.clubber = null;
        this.audio.pause();
        this.audio = null;
        this.audio = document.createElement('audio');
      }

      this.audio.crossOrigin = 'Anonymous';

      this.clubber = null;
      this.audio.src = src;

      this.currentTime = 0;

      this.audio.addEventListener('canplay', () => {

        this.clubber = new Clubber({
          size: 2048,
          mute: false
        });

        this.bands = {
          low: this.clubber.band({from:5, to:32, smooth: [0.1,0.1,0.1,0.1]}),
          mid_low: this.clubber.band({from:32, to:48, smooth: [0.1,0.1,0.1,0.1]}),
          mid_high: this.clubber.band({from:48, to:64, smooth: [0.1,0.1,0.1,0.1]}),
          high: this.clubber.band({from:64, to:160, smooth: [0.1,0.1,0.1,0.1]})
        };

        this.clubber.listen(this.audio);

        this.audio.play();
      });
    });
  }

  startStats()
  {
    this.stats = new Stats();
    this.stats.domElement.style.position = 'absolute';
    this.stats.domElement.style.bottom = 0;
    this.stats.domElement.style.display = this.DEBUG ? 'block' : 'none';
    this.stats.domElement.style.right = 0;
    this.stats.domElement.style.zIndex = 50;

    document.body.appendChild(this.stats.domElement);
    document.querySelector('.help').style.display = this.stats.domElement.style.display == 'block' ? "none" : "block";
  }

  createRender()
  {
    this.renderer = new THREE.WebGLRenderer({
      antialias : true,
      depth     : true,
      transparency: true
    });

    this.renderer.setClearColor(0x000000);
    this.renderer.setClearAlpha(0);
    // this.renderer.setPixelRatio( window.devicePixelRatio || 1 )
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.gammaInput = true;
    this.renderer.gammaOuput = true;
    this.renderer.autoClear = false;

    document.body.appendChild(this.renderer.domElement)
  }

  addComposer()
  {
    this.composer = new THREE.EffectComposer(this.renderer);

    let scenePass = new THREE.RenderPass( this.scene, this.camera, false, 0x000000, 0 );

    this.gamma = {
      uniforms: {
        tDiffuse   : {type: 't', value: null },
        resolution : {type: 'v2', value: new THREE.Vector2(
          window.innerWidth * (window.devicePixelRatio || 1),
          window.innerHeight * (window.devicePixelRatio || 1)
          )},
      },
      vertexShader   : glslify('./post-processing/glsl/screen_vert.glsl'),
      fragmentShader : glslify('./post-processing/glsl/gamma.glsl'),
    }

    this.composer.addPass(scenePass);

    let gamma = new THREE.ShaderPass(this.gamma);
    gamma.renderToScreen = true;
    this.composer.addPass(gamma);
  }

  createScene()
  {
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 9000 );
    this.camera.position.set(100, 40, -200);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enabled = this.DEBUG;
    this.controls.maxDistance = 500;
    this.controls.minDistance = 50;

    this.scene = new THREE.Scene();
  }

  addObjects()
  {
    let gridHelper = new THREE.GridHelper(100, 10);
    //this.scene.add(gridHelper);

    let geometry = new THREE.BufferGeometry().fromGeometry(new THREE.TorusGeometry(20, 21, 32, 100));

    let material = new THREE.ShaderMaterial({
      uniforms: {
        color: { type: 'c', value: new THREE.Color(0xffffff) },
        amplitude: { type: 'f', value: 1.0 },
        texture:   { type: 't', value: new THREE.TextureLoader().load('textures/metal.jpg') }
      },
      vertexShader : glslify('./glsl/basic_vert.glsl'),
      fragmentShader : glslify('./glsl/basic_frag.glsl')
    });

    let ring = new THREE.Mesh(
      geometry,
      material
    );

    this.displacement = new Float32Array(geometry.attributes.position.count);

    this.displacementSize = this.displacement.length;

    geometry.addAttribute('displacement', new THREE.BufferAttribute(this.displacement, 1));

    ring.position.x = 20;
    ring.position.y = 50;
    ring.position.z = -20;

    material.side = THREE.DoubleSide;

    this.ring = ring;

    this.ring.material.uniforms.texture.value.wrapS = this.ring.material.uniforms.texture.value.wrapT = THREE.RepeatWrapping;

    this.scene.add(this.ring);
  }

  update()
  {
    this.stats.begin();

    if (this.clubber) {

      this.clubber.update();

      let bands = [
        this.bands.low(),
        this.bands.mid_low(),
        this.bands.mid_high(),
        this.bands.high()
      ];

      let bandsSection = [
        bands[0][0], bands[0][1], bands[0][2],
        bands[1][0], bands[1][1], bands[1][2],
        bands[2][0], bands[2][1], bands[2][2]
      ]

      let [r, g, b] = [
        Math.max(bands[3][0], 0.22),
        Math.max(bands[3][1], 0.22),
        Math.max(bands[3][2], 0.22)
      ];

      this.ring.material.uniforms.color.value = new THREE.Color(r, g, b);
      this.renderer.setClearColor(new THREE.Color(1 - r, 1 - g, 1 - b), 1);

      for (var i = 0; i < this.displacementSize; i++) {
        this.displacement[i] = bandsSection[(Math.round(this.displacementSize / (i + 1)) % 9) - 1] * 100;
        this.displacement[i + 1] = bandsSection[(Math.round(this.displacementSize / (i + 1)) % 9) - 1] * 100;
        this.displacement[i + 2] = bandsSection[(Math.round(this.displacementSize / (i + 1)) % 9) - 1] * 100;
      }
    }

    var time = Date.now() * 0.001;

    //this.ring.material.uniforms.color.value.offsetHSL( 0.0005, 0, 0 );

    let el = this.clock.getElapsedTime() * .05;
    let d  = this.clock.getDelta();

    this.ring.rotation.y = this.ring.rotation.z = 0.01 * time;
    this.ring.material.uniforms.amplitude.value = 2.5 * Math.sin( this.ring.rotation.y * 0.125 );

    this.ring.geometry.attributes.displacement.needsUpdate = true;

    this.camera.position.x += (this.MOUSE.x - this.camera.position.x ) * 0.036;
    this.camera.position.y += ( -this.MOUSE.y - this.camera.position.y ) * 0.036;
    this.camera.lookAt( this.scene.position );

    this.renderer.clear();

    this.composer.render(d);

    this.stats.end()
    requestAnimationFrame(this.update.bind(this));
  }

  /*
  events
  */

  onMouseMove(e)
  {
    this.MOUSE.x = event.clientX - this.SIZE.w2;
    this.MOUSE.y = event.clientY - this.SIZE.h2;
  }

  onPlayClick(e)
  {
    this.audio.play();
  }

  onPauseClick(e) 
  {
    this.audio.pause();
  }

  onChangeSongClick(e)
  {
    sweetalert({
      title: 'Change song',
      text: 'Insert soundcloud.com url here:',
      type: 'input',
      showCancelButton: true,
      closeOnConfirm: false,
      animation: 'slide-from-top'
    }, (inputValue) => {
      if (!inputValue) return;

      this.initSoundCloud(inputValue);
    });
  }

  onKeyUp(e)
  {
    let key = e.which || e.keyCode;
    switch(key)
    {
      case 68:
        this.DEBUG = !this.DEBUG;
        if(this.stats)    this.stats.domElement.style.display = !this.DEBUG ? "none" : "block";
        if(this.gui)      this.gui.domElement.style.display = !this.DEBUG ? "none" : "block";
        if(this.controls) this.controls.enabled = this.DEBUG;
        if(document.querySelector('.help')) document.querySelector('.help').style.display = this.DEBUG ? "none" : "block";
        break;
    }
  }

  onResize()
  {
    this.SIZE = {
      w  : window.innerWidth ,
      w2 : window.innerWidth / 2,
      h  : window.innerHeight,
      h2 : window.innerHeight / 2
    };

    // OrthographicCamera
    // this.camera.left = this.SIZE.w / - 2;
		// this.camera.right = this.SIZE.w / 2;
		// this.camera.top = this.SIZE.h / 2;
		// this.camera.bottom = this.SIZE.h / - 2;

    this.renderer.setSize(this.SIZE.w, this.SIZE.h);
    this.camera.aspect = this.SIZE.w / this.SIZE.h;
    this.camera.updateProjectionMatrix();
  }
}

export default App;
