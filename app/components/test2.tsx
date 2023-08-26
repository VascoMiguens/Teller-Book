import React, { useEffect, useRef } from "react";
import * as THREE from "three";

const Book: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Create scene, camera, and renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
    const renderer = new THREE.WebGLRenderer();

    renderer.setSize(window.innerWidth, window.innerHeight);

    // Add the renderer to the DOM
    if (containerRef.current) {
      containerRef.current.appendChild(renderer.domElement);
    }

    // Ambient
    const ambient = new THREE.AmbientLight(0x222222);
    scene.add(ambient);

    // Light
    const light = new THREE.DirectionalLight(0xffffff);
    light.position.set(10, 10, 10);
    scene.add(light);

    // Add shapes
    const coverGeometry = new THREE.BoxGeometry(6.5, 8, 0.1);
    const pageGeometry = new THREE.BoxGeometry(6.4, 7.8, 0.2);
    const coverMaterial = new THREE.MeshLambertMaterial({ color: 0x2727e6 });

    //First cover
    const cover = new THREE.Mesh(coverGeometry, coverMaterial);
    const pivot = new THREE.Object3D();
    pivot.position.x = -3.25;
    pivot.position.z = 0.5;
    cover.position.x = 3.25;
    pivot.add(cover);
    scene.add(pivot);

    //Spine
    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.5, 8, 0.1), new THREE.MeshLambertMaterial({ color: 0x2727e6 }));
    spine.rotation.y = Math.PI / 2;

    // Create a pivot for the spine
    const pivotSpine = new THREE.Object3D();
    pivotSpine.position.x = -3.25;
    pivotSpine.position.z = 0;
    spine.position.x = 0;
    spine.position.z = 0.25
    pivotSpine.add(spine);
    scene.add(pivotSpine);

    // Second cover
    const cover2 = new THREE.Mesh(coverGeometry, coverMaterial);
    const pivot2 = new THREE.Object3D();
    cover2.position.x = 0;
    cover2.position.z = 0;
    pivot2.add(cover2);
    scene.add(pivot2);

    camera.position.z = 6;
    // camera.position.x = -3;
    // camera.position.y = -10;
    // camera.rotateX(1.2);

    // Animation
    const animate = function () {
      requestAnimationFrame(animate);
      if (!containerRef.current) return;

      const containerHeight = containerRef.current.clientHeight;
      const containerTop = containerRef.current.getBoundingClientRect().top;
      const scrollY = window.scrollY || window.pageYOffset;

      // Calculate scroll progress
      const progress = Math.min((scrollY + containerTop) / (containerHeight - window.innerHeight), 1);
      spine.rotation.y = Math.PI / 2;
      // Calculate rotations
      const rotationYCover = Math.min(Math.PI * (progress / 0.1), Math.PI);
      
      // Cover rotation and position
      pivot.rotation.y = -rotationYCover;
      scene.position.x = rotationYCover * 3.25 / Math.PI;

      if (rotationYCover >= Math.PI / 2 && rotationYCover <= Math.PI) {
        // Calculate the progress after the cover reaches 90 degrees
        const after90Progress = (rotationYCover - Math.PI / 2) / (Math.PI / 2);
        
        pivotSpine.rotation.y = -after90Progress * Math.PI / 2;
        // Adjust the spine and cover's position so the cover is after the spine
        pivot.position.x = -3.25 - 0.5 * after90Progress;
        
        // Move the cover and spine along z-axis based on progress
        const zPositionCover = 0.5 - 0.5 * after90Progress;
        pivot.position.z = zPositionCover;

       
      }
      renderer.render(scene, camera);
    };
    
    animate();
  }, []);

  return <div className="container" ref={containerRef} style={{ position: "fixed", top: "0", left: "0", height: "1000vh" }} />;
};

export default Book;