import React, { useEffect, useState } from 'react';
import * as THREE from 'three';
import axios from 'axios'; // Volvemos a incluir axios para obtener los cometas
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import './App.css';

// Componente para mostrar la información de los planetas y cometas
const PlanetInfo = ({ planet }) => {
  if (!planet) {
    return <div className="planet-info">Haz clic en un planeta para ver la información</div>;
  }

  return (
    <div className="planet-info">
      <h2>{planet.name}</h2>
      <p><strong>Diámetro:</strong> {planet.realDiameter} km</p>
      <p><strong>Distancia al Sol:</strong> {planet.realDistance} millones de km</p>
      {planet.composition && <p><strong>Composición:</strong> {planet.composition}</p>}
    </div>
  );
};

// Función para resolver la ecuación de Kepler
const solveKepler = (M, e, tol = 1e-6) => {
  let E = M;
  let deltaE = 1;
  while (Math.abs(deltaE) > tol) {
    deltaE = (M - (E - e * Math.sin(E))) / (1 - e * Math.cos(E));
    E = E + deltaE;
  }
  return E;
};

// Función para convertir a coordenadas heliocéntricas
const calculatePosition = (a, e, I, ω, Ω, L, T) => {
  const M = ((L - ω) + 360 * (T / 36525)) % 360;
  const M_rad = THREE.MathUtils.degToRad(M);

  const E = solveKepler(M_rad, e);

  const x_orbital = a * (Math.cos(E) - e);
  const y_orbital = a * Math.sqrt(1 - e * e) * Math.sin(E);

  const x_ec = (Math.cos(Ω) * Math.cos(ω) - Math.sin(Ω) * Math.sin(ω) * Math.cos(I)) * x_orbital +
    (-Math.cos(Ω) * Math.sin(ω) - Math.sin(Ω) * Math.cos(ω) * Math.cos(I)) * y_orbital;

  const y_ec = (Math.sin(Ω) * Math.cos(ω) + Math.cos(Ω) * Math.sin(ω) * Math.cos(I)) * x_orbital +
    (-Math.sin(Ω) * Math.sin(ω) + Math.cos(Ω) * Math.cos(ω) * Math.cos(I)) * y_orbital;

  const z_ec = (Math.sin(ω) * Math.sin(I)) * x_orbital + (Math.cos(ω) * Math.sin(I)) * y_orbital;

  return { x: x_ec, y: y_ec, z: z_ec };
};

// Función para crear la órbita elíptica como una línea
const createOrbitLine = (a, e, I, ω, Ω, L, distance, T) => {
  const points = [];
  for (let i = 0; i <= 360; i++) {
    const M = (L + i) % 360;
    const M_rad = THREE.MathUtils.degToRad(M);
    const E = solveKepler(M_rad, e);

    const x_orbital = a * (Math.cos(E) - e);
    const y_orbital = a * Math.sqrt(1 - e * e) * Math.sin(E);

    const x_ec = (Math.cos(Ω) * Math.cos(ω) - Math.sin(Ω) * Math.sin(ω) * Math.cos(I)) * x_orbital +
      (-Math.cos(Ω) * Math.sin(ω) - Math.sin(Ω) * Math.cos(ω) * Math.cos(I)) * y_orbital;

    const y_ec = (Math.sin(Ω) * Math.cos(ω) + Math.cos(Ω) * Math.sin(ω) * Math.cos(I)) * x_orbital +
      (-Math.sin(Ω) * Math.sin(ω) + Math.cos(Ω) * Math.cos(ω) * Math.cos(I)) * y_orbital;

    const z_ec = (Math.sin(ω) * Math.sin(I)) * x_orbital + (Math.cos(ω) * Math.sin(I)) * y_orbital;

    points.push(new THREE.Vector3(x_ec * distance, y_ec * distance, z_ec * distance));
  }

  const orbitGeometry = new THREE.BufferGeometry().setFromPoints(points);
  const orbitMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
  const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);

  return orbitLine;
};

// Datos reales de planetas
const orbitalElements = {
  mercurio: { 
    a: 0.387, e: 0.205, I: 7.0, L: 252.25, ω: 77.45, Ω: 48.33, 
    texture: 'C:/Users/damia/Desktop/Planetarium/public/texturamercurio.jpg', 
    size: 0.3, realDiameter: 4879, realDistance: 57.9, 
    composition: 'Mercurio está compuesto principalmente de metales (70% hierro) y silicatos (30%). Tiene un gran núcleo de hierro.' 
  },
  // Resto de los planetas...
};

// Función para crear planetas con texturas y sus posiciones keplerianas y su órbita
const createPlanet = (name, size, distance, texturePath, orbitalParams, T) => {
  const geometry = new THREE.SphereGeometry(size * 2.5, 32, 32);
  const textureLoader = new THREE.TextureLoader();
  const texture = textureLoader.load(texturePath);
  const material = new THREE.MeshPhongMaterial({ map: texture, shininess: 100 });
  const planet = new THREE.Mesh(geometry, material);

  const position = calculatePosition(
    orbitalParams.a,
    orbitalParams.e,
    THREE.MathUtils.degToRad(orbitalParams.I),
    THREE.MathUtils.degToRad(orbitalParams.ω),
    THREE.MathUtils.degToRad(orbitalParams.Ω),
    orbitalParams.L,
    T
  );

  planet.position.set(position.x * distance, position.y * distance, position.z * distance);
  planet.name = name;
  planet.size = size;
  planet.distance = distance;

  const orbitLine = createOrbitLine(
    orbitalParams.a,
    orbitalParams.e,
    THREE.MathUtils.degToRad(orbitalParams.I),
    THREE.MathUtils.degToRad(orbitalParams.ω),
    THREE.MathUtils.degToRad(orbitalParams.Ω),
    orbitalParams.L,
    distance,
    T
  );

  return { planet, orbitLine };
};

// Función para crear cometas con sus respectivas propiedades
const createComet = (name, orbitalParams, composition, size = 0.3, color = 0xffffff) => {
  const geometry = new THREE.SphereGeometry(size, 32, 32);
  const material = new THREE.MeshBasicMaterial({ color });
  const comet = new THREE.Mesh(geometry, material);

  const position = calculatePosition(
    parseFloat(orbitalParams.q_au_1),
    parseFloat(orbitalParams.e),
    THREE.MathUtils.degToRad(parseFloat(orbitalParams.i_deg)),
    THREE.MathUtils.degToRad(parseFloat(orbitalParams.w_deg)),
    THREE.MathUtils.degToRad(parseFloat(orbitalParams.node_deg)),
    parseFloat(orbitalParams.tp_tdb),
    2451545.0
  );

  comet.position.set(position.x * 100, position.y * 100, position.z * 100);
  comet.name = name;
  comet.composition = composition;

  return comet;
};

const App = () => {
  const [selectedPlanet, setSelectedPlanet] = useState(null);
  const [planetsArray, setPlanetsArray] = useState([]);
  const [cometsArray, setCometsArray] = useState([]);
  const [camera, setCamera] = useState(null);

  useEffect(() => {
    const scene = new THREE.Scene();

    const cam = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 5000);
    cam.position.z = 300;
    setCamera(cam);

    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const controls = new OrbitControls(cam, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;

    const ambientLight = new THREE.AmbientLight(0xffffff, 4);
    scene.add(ambientLight);

    const planetsArrayTemp = [];

    const textureLoader = new THREE.TextureLoader();
    const sunTexture = textureLoader.load('./texturasol.jpg');
    const sunGeometry = new THREE.SphereGeometry(15, 32, 32);
    const sunMaterial = new THREE.MeshPhongMaterial({ map: sunTexture, shininess: 150 });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sun);

    let T = 2451545.0;
    let velocityFactor = 20;

    // Crear planetas
    Object.keys(orbitalElements).forEach((planetKey) => {
      const planetParams = orbitalElements[planetKey];
      const { planet, orbitLine } = createPlanet(
        planetKey,
        planetParams.size,
        50,
        planetParams.texture,
        planetParams,
        T
      );

      scene.add(planet);
      scene.add(orbitLine);
      planetsArrayTemp.push(planet);
    });

    setPlanetsArray(planetsArrayTemp);

    // Solicitud de cometas desde la API de la NASA
    const fetchComets = async () => {
      try {
        const response = await axios.get('https://data.nasa.gov/resource/b67r-rgxc.json');
        const cometData = response.data;

        const cometsTempArray = [];

        cometData.forEach(comet => {
          if (comet.tp_tdb && comet.q_au_1) {
            const newComet = createComet(comet.object, comet, comet.composition || 'Desconocida');
            scene.add(newComet);
            cometsTempArray.push(newComet);
          }
        });

        setCometsArray(cometsTempArray);
      } catch (error) {
        console.error('Error al obtener los datos de cometas', error);
      }
    };

    fetchComets();

    // Raycaster para detección de clics
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseMove = (event) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, cam);
      const intersects = raycaster.intersectObjects([...planetsArrayTemp, ...cometsArray]);
      document.body.style.cursor = intersects.length > 0 ? 'pointer' : 'default';
    };

    const onMouseClick = (event) => {
      raycaster.setFromCamera(mouse, cam);
      const intersects = raycaster.intersectObjects(planetsArrayTemp);
      if (intersects.length > 0) {
        const clickedPlanetName = intersects[0].object.name;  // Obtenemos el nombre del planeta clicado
        const clickedPlanet = orbitalElements[clickedPlanetName]; // Obtenemos los detalles del planeta desde `orbitalElements`
        if (clickedPlanet) {
          setSelectedPlanet({ ...clickedPlanet, name: clickedPlanetName }); // Aseguramos que `name` esté incluido en el estado
        }
      }
    };
    

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('click', onMouseClick);

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();

      T += velocityFactor;
      planetsArrayTemp.forEach((planet) => {
        const orbitalParams = orbitalElements[planet.name];
        const position = calculatePosition(
          orbitalParams.a,
          orbitalParams.e,
          THREE.MathUtils.degToRad(orbitalParams.I),
          THREE.MathUtils.degToRad(orbitalParams.ω),
          THREE.MathUtils.degToRad(orbitalParams.Ω),
          orbitalParams.L,
          T
        );
        planet.position.set(position.x * planet.distance, position.y * planet.distance, position.z * planet.distance);
      });

      renderer.render(scene, cam);
    };

    animate();

    return () => {
      document.body.removeChild(renderer.domElement);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('click', onMouseClick);
    };
  }, []);

  const focusOnPlanet = (planet) => {
    if (camera && planet) {
      const planetSize = planet.size;
      const zoomFactor = 6;

      const offsetDistance = planet.name === 'jupiter'
        ? planetSize * zoomFactor - 20
        : planetSize * zoomFactor - 10;

      const direction = new THREE.Vector3()
        .subVectors(new THREE.Vector3(0, 0, 0), planet.position)
        .normalize();

      camera.position.set(
        planet.position.x + direction.x * offsetDistance,
        planet.position.y + direction.y * offsetDistance,
        planet.position.z + direction.z * offsetDistance
      );

      camera.lookAt(planet.position);
      camera.updateProjectionMatrix();
    }
  };

  return (
    <div>
      <div className="planet-menu">
        <h2>Planetas</h2>
        <ul>
          {planetsArray.map((planet) => (
            <li key={planet.name} onClick={() => focusOnPlanet(planet)}>
              {planet.name}
            </li>
          ))}
        </ul>
      </div>
      <PlanetInfo planet={selectedPlanet} />
    </div>
  );
};

export default App;











