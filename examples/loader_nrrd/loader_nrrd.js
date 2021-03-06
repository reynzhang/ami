/* globals Stats*/

// promises polyfill from the babel team
import 'babel-polyfill';

import ControlsTrackball from '../../src/controls/controls.trackball';
import HelpersStack      from '../../src/helpers/helpers.stack';
import LoadersVolume     from '../../src/loaders/loaders.volume';

let VJS = VJS || {};

VJS.widgets = VJS.widgets || {};
VJS.widgets.orientation = require('../../src/widgets/widgets.orientation');

// standard global variables
let controls, renderer, stats, scene, camera, stackHelper, threeD;

function init() {

  // this function is executed on each animation frame
  function animate() {

    // if (stackHelper) {
    //   stackHelper.index += 1;
    //   if (stackHelper.outOfBounds === true) {
    //     stackHelper.orientation = (stackHelper.orientation + 1) % 3;
    //     stackHelper.index = 0;
    //   }
    // }

    controls.update();
    renderer.render(scene, camera);
    stats.update();

    // request new frame
    requestAnimationFrame(function() {
      animate();
    });
  }

  // renderer
  threeD = document.getElementById('r3d');
  renderer = new THREE.WebGLRenderer({
    antialias: true
  });
  renderer.setSize(threeD.offsetWidth, threeD.offsetHeight);
  renderer.setClearColor(0x673AB7, 1);
  renderer.setPixelRatio(window.devicePixelRatio);
  threeD.appendChild(renderer.domElement);

  // stats
  stats = new Stats();
  threeD.appendChild(stats.domElement);

  // scene
  scene = new THREE.Scene();

  // camera
  camera = new THREE.PerspectiveCamera(45, threeD.offsetWidth / threeD.offsetHeight, 1, 10000000);
  camera.position.x = 250;
  camera.position.y = 250;
  camera.position.z = 250;

  // light
  // var dirLight = new THREE.DirectionalLight( 0xffffff );
  // dirLight.position.set( 200, 200, 1000 ).normalize();
  // camera.add( dirLight );
  // camera.add( dirLight.target );
//   let particleLight = new THREE.Mesh( new THREE.SphereBufferGeometry( 4, 8, 8 ), new THREE.MeshBasicMaterial( { color: 0xffffff } ) );
// scene.add( particleLight );

scene.add( new THREE.AmbientLight( 0x353535 ) );
let directionalLight = new THREE.DirectionalLight( 0xffffff, 1 );
directionalLight.position.set( 200, 200, 1000 ).normalize();
scene.add( directionalLight );

  // controls
  controls = new ControlsTrackball(camera, threeD);
  controls.rotateSpeed = 1.4;
  controls.zoomSpeed = 1.2;
  controls.panSpeed = 0.8;

  animate();
}

window.onload = function() {

  // init threeJS...
  init();

  // load vtk file
  var loader1 = new THREE.VTKLoader();
  loader1.load( 'https://cdn.rawgit.com/FNNDSC/data/master/vtk/marc_avf/avf.vtk', function ( geometry ) {
    geometry.computeVertexNormals();
    var material = new THREE.MeshLambertMaterial( {
      color: 0xE91E63,
      side: THREE.DoubleSide,
      opacity: 0.75,
      transparent: true } );
    var mesh = new THREE.Mesh( geometry, material );
    var RASToLPS = new THREE.Matrix4();
    RASToLPS.set(-1, 0, 0, 0,
                0, -1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1);
    mesh.applyMatrix(RASToLPS);
    scene.add( mesh );
  } );

  // instantiate the loader
  // it loads and parses the dicom image
  let loader = new LoadersVolume(threeD);

  var t2 = [
    'avf_float_32.nrrd'
  ];

  var files = t2.map(function(v) {
    return 'https://cdn.rawgit.com/FNNDSC/data/master/nrrd/marc_avf/' + v;
  });

  // load sequence for each file
  let seriesContainer = [];
  let loadSequence = [];
  files.forEach(function(url) {
    loadSequence.push(
      Promise.resolve()
      // fetch the file
      .then(function() {
        return loader.fetch(url);
      })
      .then(function(data) {
        return loader.parse(data);
      })
      .then(function(series) {
        seriesContainer.push(series);
      })
      .catch(function(error) {
        window.console.log('oops... something went wrong...');
        window.console.log(error);
      })
    );
  });

  // load sequence for all files
  Promise
  .all(loadSequence)
  .then(function() {
    loader.free();
    loader = null;
    // make a proper function for this guy...
    let series = seriesContainer[0].mergeSeries(seriesContainer)[0];
    let stack = series.stack[0];
    stackHelper = new HelpersStack(stack);
    stackHelper.bbox.color = 0xF9F9F9;
    stackHelper.border.color = 0xF9F9F9;
    scene.add(stackHelper);

    window.console.log(stackHelper.stack.minMax);
    window.console.log(stackHelper);

    // update camrea's and control's target
    let centerLPS = stackHelper.stack.worldCenter();
    camera.lookAt(centerLPS.x, centerLPS.y, centerLPS.z);
    camera.updateProjectionMatrix();
    controls.target.set(centerLPS.x, centerLPS.y, centerLPS.z);

    function onWindowResize() {

      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();

      renderer.setSize(window.innerWidth, window.innerHeight);

    }

    window.addEventListener('resize', onWindowResize, false);
  })
  .catch(function(error) {
    window.console.log('oops... something went wrong...');
    window.console.log(error);
  });
};
