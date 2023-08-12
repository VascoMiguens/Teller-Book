import React, { useEffect, useRef } from "react";
import * as THREE from "three";

const Book: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Create scene, camera, and renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
    const renderer = new THREE.WebGLRenderer();

    renderer.setSize(window.innerWidth, window.innerHeight);

    // Add the renderer to the DOM
    if (bookRef.current) {
        if(containerRef.current) {
            containerRef.current.appendChild(bookRef.current);
            bookRef.current.appendChild(renderer.domElement);
        }
    }

    //Ambient
    const ambient = new THREE.AmbientLight(0x222222);
    scene.add(ambient);

    //Light
    const light = new THREE.DirectionalLight(0xffffff);
    light.position.set(0, 0, 6);
    scene.add(light);

    // Add shapes
    const geometry = new THREE.BoxGeometry(6.5, 8, 0.1);
    const material = new THREE.MeshLambertMaterial({ color: 0x2727e6 });
    const cover = new THREE.Mesh(geometry, material);
    const cover2 = new THREE.Mesh(geometry, material);

    const pivot = new THREE.Object3D();
    pivot.position.x = -3.25;
    cover.position.x = 3.25;
    pivot.add(cover);

    const pivot2 = new THREE.Object3D();
    cover.position.x = 0;
    pivot2.add(cover2);

    scene.add(pivot, pivot2);

    camera.position.z = 6;

    // Animate the scene
    const animate = function () {
      requestAnimationFrame(animate);

      const scrollProgress = Math.min(window.scrollY / 3000, 1);
      const bookTimeline = Math.min(scrollProgress * 2, 1);
      const pageTimeline = Math.max(scrollProgress * 2 - 1, 0);
      const rotationY = Math.PI * pageTimeline; // Increase rotation to simulate opening

      scene.position.x = bookTimeline * 3.25; // Move the scene to the right
      pivot.rotation.y = -rotationY; // Rotate the left page

      renderer.render(scene, camera);
    };

    animate();
  }, []);

  return (
    <div className="container" ref={containerRef}>
      <div className="book" ref={bookRef} style={{position: "fixed", top: "0", left: "0", minHeight: "calc(3000px + 100vh)"}}></div>
    </div>
  );
};

export default Book;
