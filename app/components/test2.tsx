import React, { useEffect, useRef } from "react";
import * as THREE from "three";

const Book: React.FC = () => {
  // reference to the container div
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Create scene, camera, and renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
    const renderer = new THREE.WebGLRenderer();

    // Set the renderer size to match the window dimensions
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

    // Define geometries, materials, and shapes for the book cover, spine, and pages
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

    //Pages
    const pages: THREE.Object3D[] = [];
    const pagePivots: THREE.Object3D[] = [];
    const pageColors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff];
    for (let i = 4; i >= 0; i--) {
      const page = new THREE.Mesh(new THREE.BoxGeometry(6.4, 7.8, 0.2), new THREE.MeshLambertMaterial({ color: pageColors[i % pageColors.length] }));
  
      // Create a pivot for each page at the left edge
      const pivotPage = new THREE.Object3D();
      page.position.x = 3.15;
      pivotPage.position.z = 0.1;
      page.position.z = 0.01* (4 - i); // Adjust z-position calculation
      pivotPage.add(page);
      pages.push(page);
      pagePivots.push(pivotPage); // Store the pivot

    }
    pivotSpine.add(...pagePivots);
    
    // Second cover
    const cover2 = new THREE.Mesh(coverGeometry, coverMaterial);
    const pivot2 = new THREE.Object3D();
    cover2.position.x = 0;
    cover2.position.z = 0;
    pivot2.add(cover2);
    scene.add(pivot2);

    // Set initial camera position and rotation
    camera.position.z = 6;
    // camera.position.x = -3;
    // camera.position.y = -10;
    // camera.rotateX(1.2);

    // Animation
    const animate = function () {
      requestAnimationFrame(animate);
        // Check if the container reference is available
      if (!containerRef.current) return;

      
      const containerHeight = containerRef.current.clientHeight;
      const containerTop = containerRef.current.getBoundingClientRect().top;
      const scrollY = window.scrollY || window.pageYOffset;

      // Calculate scroll progress
      const progress = Math.min((scrollY + containerTop) / (containerHeight - window.innerHeight), 1);
       // Update spine rotation and cover position based on scroll progress
      spine.rotation.y = Math.PI / 2;
      const rotationYCover = Math.min(Math.PI * (progress / 0.1), Math.PI);
      pivot.rotation.y = -rotationYCover;
      scene.position.x = rotationYCover * 3.25 / Math.PI;
      // Update animations after the cover reaches 90 degrees
      if (rotationYCover >= Math.PI / 2 && rotationYCover <= Math.PI) {
        // Calculate the progress after the cover reaches 90 degrees
        const after90Progress = (rotationYCover - Math.PI / 2) / (Math.PI / 2);
        
        pivotSpine.rotation.y = -after90Progress * Math.PI / 2;
        // Adjust the spine and cover's position so the cover is after the spine
        pivot.position.x = -3.25 - 0.5 * after90Progress;
        
        // Move the cover and spine along z-axis based on progress
        const zPositionCover = 0.5 - 0.5 * after90Progress;
        pivot.position.z = zPositionCover;

        pagePivots.forEach((pivotPage, index) => {
          pivotPage.rotation.y= after90Progress * Math.PI / 2;
          pivotPage.position.z = 0.03 * index ;
          pivotPage.position.x = 0.05 * after90Progress;
        });
      }

       // Update page flipping animations
      if (progress > 0.12) {  
        const pageProgress = (progress - 0.12) / 0.3;
        pagePivots.forEach((page, index) => {
          const reverseIndex = pages.length - index - 1;
          const flipStart = reverseIndex / pages.length;
          const flipEnd = (reverseIndex + 1) / pages.length;
          
          if (pageProgress >= flipStart && pageProgress <= flipEnd) {
            const normalizedProgress = (pageProgress - flipStart) / (flipEnd - flipStart);
            page.rotation.y = Math.PI / 2 - normalizedProgress * Math.PI; // Adjust the rotation width according to the final position
            // Adjust z-position according to index of page
            // page.position.z = 0.004 * index;
            page.position.x = 0.05; // adjust x position to match with the rotation
          } else if (pageProgress > flipEnd) {
            page.rotation.y = -Math.PI / 2;
            // Fix the z-position after the page has finished flipping
            // page.position.z = 0.004 * index;
            page.position.x = 0.02 ;
          }
        });
        
      
    }
      renderer.render(scene, camera);
    };
    
    animate();
  }, []);

  return <div className="container" ref={containerRef} style={{ position: "fixed", top: "0", left: "0", height: "1000vh" }} />;
};

export default Book;