import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import "./style.css";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, 300 / 251, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(300, 251);
const text = document.querySelector("section .text");
text?.before(renderer.domElement);

const loader = new GLTFLoader();
loader.load("/compass/scene.gltf", (gltf) => {
  scene.add(gltf.scene);
  camera.position.z = 1.15;
  camera.position.x = 0.55;
  camera.position.y = 1.15;
  camera.lookAt(0, 0, 0);
});

function loop() {
  requestAnimationFrame(loop);
  // Change the rotation of the cube
  scene.rotation.x += 0.01;
  scene.rotation.y += 0.01;
  scene.rotation.z += 0.01;
  renderer.render(scene, camera);
}

loop();

// WebXR

const xrBtn = document.querySelector("#vr")!;

if (!("xr" in navigator)) xrBtn.remove();

navigator.xr!.isSessionSupported("immersive-ar").then((supported) => {
  if (!supported) {
    xrBtn.remove();
    return;
  }
  xrBtn.addEventListener("click", async () => {
    const canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
    const gl = canvas.getContext("webgl", { xrCompatible: true })!;
    const scene = new THREE.Scene();
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.3);
    directionalLight.position.set(10, 15, 10);
    scene.add(directionalLight);
    let reticle: THREE.Group;
    loader.load(
      "https://immersive-web.github.io/webxr-samples/media/gltf/reticle/reticle.gltf",
      function (gltf) {
        reticle = gltf.scene;
        reticle.visible = false;
        scene.add(reticle);
      }
    );
    var model: THREE.Group;
    loader.load("/compass/scene.gltf", (gltf) => {
      model = gltf.scene;
      model.scale.set(0.03, 0.03, 0.03);
    });
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      preserveDrawingBuffer: true,
      canvas: canvas,
      context: gl
    });
    renderer.autoClear = false;
    const camera = new THREE.PerspectiveCamera();
    camera.matrixAutoUpdate = false;
    const session = await navigator.xr!.requestSession("immersive-ar", {
      requiredFeatures: ["hit-test"]
    });
    session.updateRenderState({
      baseLayer: new XRWebGLLayer(session, gl)
    });
    const referenceSpace = await session.requestReferenceSpace("local");
    // Create another XRReferenceSpace that has the viewer as the origin.
    const viewerSpace = await session.requestReferenceSpace("viewer");
    // Perform hit testing using the viewer as origin.
    const hitTestSource = await session.requestHitTestSource!({
      space: viewerSpace
    });
    const onXRFrame = (time: any, frame: any) => {
      time;
      session.requestAnimationFrame(onXRFrame);

      gl.bindFramebuffer(
        gl.FRAMEBUFFER,
        session.renderState.baseLayer!.framebuffer
      );

      const pose = frame.getViewerPose(referenceSpace);
      if (pose) {
        const view = pose.views[0];

        const viewport = session.renderState.baseLayer!.getViewport(view)!;
        renderer.setSize(viewport.width, viewport.height);

        camera.matrix.fromArray(view.transform.matrix);
        camera.projectionMatrix.fromArray(view.projectionMatrix);
        camera.updateMatrixWorld(true);

        const hitTestResults = frame.getHitTestResults(hitTestSource);
        if (hitTestResults.length > 0 && reticle) {
          const hitPose = hitTestResults[0].getPose(referenceSpace);
          reticle.visible = true;
          reticle.position.set(
            hitPose.transform.position.x,
            hitPose.transform.position.y,
            hitPose.transform.position.z
          );
          reticle.updateMatrixWorld(true);
        }

        renderer.render(scene, camera);
      }

      session.addEventListener("select", () => {
        if (model) {
          const clone = model.clone();
          clone.position.copy(reticle.position);
          scene.add(clone);
        }
      });
    };
    session.requestAnimationFrame(onXRFrame);
  });
});
