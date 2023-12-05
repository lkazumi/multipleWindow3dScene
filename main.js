import WindowManager from './WindowManager.js';

const t = THREE;
let camera, scene, renderer, world;
let near, far;
let pixR = window.devicePixelRatio ? window.devicePixelRatio : 1;
let particles = [];
let sceneOffsetTarget = { x: 0, y: 0 };
let sceneOffset = { x: 0, y: 0 };

let today = new Date();
today.setHours(0);
today.setMinutes(0);
today.setSeconds(0);
today.setMilliseconds(0);
today = today.getTime();

let internalTime = getTime();
let windowManager;
let initialized = false;

// get time in seconds since the beginning of the day (so that all windows use the same time)
function getTime() {
    return (new Date().getTime() - today) / 1000.0;
}

if (new URLSearchParams(window.location.search).get("clear")) {
    localStorage.clear();
} else {
    // this code is essential to circumvent that some browsers preload the content of some pages before you actually hit the URL
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState != 'hidden' && !initialized) {
            init();
        }
    });

    window.onload = () => {
        if (document.visibilityState != 'hidden') {
            init();
        }
    };

    function init() {
        initialized = true;

        // add a short timeout because window.offsetX reports wrong values before a short period
        setTimeout(() => {
            setupScene();
            setupWindowManager();
            resize();
            updateWindowShape(false);
            render();
            window.addEventListener('resize', resize);
        }, 500)
    }

    function setupScene() {
        camera = new t.OrthographicCamera(0, 0, window.innerWidth, window.innerHeight, -10000, 10000);

        camera.position.z = 2.5;
        near = camera.position.z - .5;
        far = camera.position.z + 0.5;

        scene = new t.Scene();
        scene.background = new t.Color(0.0);
        scene.add(camera);

        renderer = new t.WebGLRenderer({ antialias: true, depthBuffer: true });
        renderer.setPixelRatio(pixR);

        world = new t.Object3D();
        scene.add(world);

        renderer.domElement.setAttribute("id", "scene");
        document.body.appendChild(renderer.domElement);
    }

    function setupWindowManager() {
        windowManager = new WindowManager();
        windowManager.setWinShapeChangeCallback(updateWindowShape);
        windowManager.setWinChangeCallback(windowsUpdated);

        // here you can add your custom metadata to each window's instance
        let metaData = { foo: "bar" };

        // this will initialize the window manager and add this window to the centralized pool of windows
        windowManager.init(metaData);

        // call update windows initially (it will later be called by the win change callback)
        windowsUpdated();
    }

    function windowsUpdated() {
        updateNumberOfParticles();
    }

    function updateNumberOfParticles() {
        let wins = windowManager.getWindows();

        // remove all particles
        particles.forEach((p) => {
            world.remove(p);
        });

        particles = [];

        // add new particles based on the current window setup
        for (let i = 0; i < wins.length; i++) {
            let win = wins[i];

            let c = new t.Color();
            c.setHSL(i * .1, 1.0, .5);

            let s = 100 + i * 50;
            let particleCount = 1000;  // Aumente o número de partículas
            let particleGeometry = new t.Geometry();

            for (let p = 0; p < particleCount; p++) {
                let theta = Math.random() * Math.PI * 2;
                let phi = Math.random() * Math.PI;
                let radius = s * Math.random();

                let particle = new t.Vector3(
                    radius * Math.sin(phi) * Math.cos(theta),
                    radius * Math.sin(phi) * Math.sin(theta),
                    radius * Math.cos(phi)
                );
                particleGeometry.vertices.push(particle);
            }

            let particleMaterial = new t.PointsMaterial({
                color: c,
                size: 2,  // Ajuste o tamanho do ponto
                transparent: true,
            });

            let particleSystem = new t.Points(particleGeometry, particleMaterial);
            particleSystem.position.x = win.shape.x + (win.shape.w * .5);
            particleSystem.position.y = win.shape.y + (win.shape.h * .5);

            world.add(particleSystem);
            particles.push(particleSystem);
        }
    }

    function updateWindowShape(easing = true) {
        // storing the actual offset in a proxy that we update against in the render function
        sceneOffsetTarget = { x: -window.screenX, y: -window.screenY };
        if (!easing) sceneOffset = sceneOffsetTarget;
    }

    let movementSpeed = 1.000; // Velocidade de movimentação aleatória

    function render() {
        let t = getTime();

        windowManager.update();

        // calculate the new position based on the delta between current offset and new offset times a falloff value (to create the nice smoothing effect)
        let falloff = 0.05;
        sceneOffset.x = sceneOffset.x + ((sceneOffsetTarget.x - sceneOffset.x) * falloff);
        sceneOffset.y = sceneOffset.y + ((sceneOffsetTarget.y - sceneOffset.y) * falloff);

        // set the world position to the offset
        world.position.x = sceneOffset.x;
        world.position.y = sceneOffset.y;

        let wins = windowManager.getWindows();

        // loop through all our particles and update their positions based on current window positions
        for (let i = 0; i < particles.length; i++) {
            let particle = particles[i];
            let win = wins[i];

            // Movimentação aleatória
            particle.position.x += (Math.random() - 0.5) * movementSpeed;
            particle.position.y += (Math.random() - 0.5) * movementSpeed;

            // Limite para manter as partículas dentro da janela
            particle.position.x = Math.max(win.shape.x, Math.min(win.shape.x + win.shape.w, particle.position.x));
            particle.position.y = Math.max(win.shape.y, Math.min(win.shape.y + win.shape.h, particle.position.y));
        }

        renderer.render(scene, camera);
        requestAnimationFrame(render);
    }

    // resize the renderer to fit the window size
    function resize() {
        let width = window.innerWidth;
        let height = window.innerHeight

        camera = new t.OrthographicCamera(0, width, 0, height, -10000, 10000);
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    }
}
