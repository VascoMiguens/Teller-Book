import { shaderMaterial } from "@react-three/drei";
import gsap from "gsap";
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

const Book: React.FC = () => {
  // reference to the container div
  const containerRef = useRef<HTMLDivElement>(null);
  // const scrollDirection = useRef(0);
  const currentPage = useRef(0);

  // Ref states for managing animation
  const isCoverAnimating = useRef(false);
  const pageAnimationFlags = useRef<boolean[]>([]);
  const pageTurnDirection = useRef<'forward' | 'backward' | 'none'>('none');

  // Initial positions of the book components
  const initialPivotRotationY = useRef(0); // Default initial rotation
  const initialPivotPositionX = useRef(0); // Default initial X position
  const initialPivotPositionZ = useRef(0); // Default initial Z position
  const initialSpineRotationY = useRef(0); // Default initial rotation
  const initialSpinePositionX = useRef(0); // Default initial X position
  const initialSpinePositionZ = useRef(0); // Default initial Z position
  const initialPagePivotXPositions = useRef<number[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

      // Create scene, camera, and renderer
      const scene = initializeScene();
      const camera = initializeCamera();
      const renderer = initializeRenderer(containerRef.current);
     

      const [pivot,pivot2,  pivotSpine, spine, pages, pagePivots] = initializeBook(scene);
      const animate = () => {
        requestAnimationFrame(animate);
        handleScrollAnimations(camera, scene, pivot,pivot2, pivotSpine, spine, pages, pagePivots, renderer);
          renderer.render(scene, camera);
          
      };

      const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setPixelRatio(window.devicePixelRatio); // Add this line
        renderer.setSize(window.innerWidth, window.innerHeight);
      };

      window.addEventListener('resize', handleResize)

      const handlePreviousPage = () => {
        if (currentPage.current > 0) {
          pageTurnDirection.current = 'backward';
          currentPage.current--;
        }
      };
      
      const handleNextPage = () => {
        if (currentPage.current < pagePivots.length + 1) {
          pageTurnDirection.current = 'forward';
          currentPage.current++;
        }
      };

      
      const prevArrow = containerRef.current.querySelector('.prev-arrow');
      const nextArrow = containerRef.current.querySelector('.next-arrow');
      prevArrow?.addEventListener('click', handlePreviousPage);
      nextArrow?.addEventListener('click', handleNextPage);
      animate();

        return () => {
          prevArrow?.removeEventListener('click', handlePreviousPage);
          nextArrow?.removeEventListener('click', handleNextPage);
        }
  }, []);

  function initializeScene(): THREE.Scene {
    const scene = new THREE.Scene();

    // Lighting setup
    const ambient = new THREE.AmbientLight(0x222222);
    scene.add(ambient);

    const light = new THREE.DirectionalLight(0xffffff);
    light.position.set(10, 10, 10);
    scene.add(light);

    return scene;
  }

  function initializeCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.z = 18;
    // camera.position.x = -2;
    // camera.position.y = -18;
    // camera.rotateX(1.2)
    // camera.rotateX(0.05);


    return camera;
  }

  function initializeRenderer(container: HTMLDivElement): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);
    return renderer;
  }

  function initializeBook(scene: THREE.Scene): [THREE.Object3D, THREE.Object3D, THREE.Object3D,THREE.Mesh,THREE.Object3D[], THREE.Object3D[]] {
    const coverGeometry = new THREE.BoxGeometry(6.5, 8, 0.1);
    const coverMaterial = new THREE.MeshLambertMaterial({ color: 0x2727e6 });

    //First cover
    const cover = new THREE.Mesh(coverGeometry, coverMaterial);
    const pivot = new THREE.Object3D();
    pivot.position.x = -3.25;
    pivot.position.z = 0.5;
    cover.position.x = 3.20;
    pivot.add(cover);
    scene.add(pivot);

    //Spine
    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.5, 8, 0.1), new THREE.MeshLambertMaterial({ color: 0xcc0000 }));
    

    // Create a pivot for the spine
    const pivotSpine = new THREE.Object3D();
    pivotSpine.position.x = -3.25;
    pivotSpine.position.z = 0.25;
    spine.position.x = 0;
    spine.rotation.y = -Math.PI / 2;
    spine.position.z = 0;
    pivotSpine.add(spine);
    scene.add(pivotSpine);

    // Page Animations
    const vertexShader = `
      varying vec2 vUv;
      uniform float turnProgress; // Progress of the page turn, ranges from 0 to 1
      uniform float pageWidth;
      uniform float pageHeight;
      uniform float rotationY;
      uniform float bendIntensity; 
      uniform float turnDirection;

      void main() {
        vUv = uv;
        vec3 pos = position;

        // Calculate the vertical position as a percentage (0 at bottom, 1 at top)
        float verticalPosition = (pos.y + pageHeight * 0.5) / pageHeight;

        // Define the fold line to be 0.5 units from the leftmost edge
        float foldLine = -pageWidth * 0.5 + 0.5;

        // Calculate the distance from the fold line
        float distanceFromFold = abs(pos.x - foldLine);

        // Parameters for the bend
        float startBend = 0.01 + (-pageWidth * 0.5); // Start of the bend, 0.01 units from the left edge
        float peakBend = 1.5 + (-pageWidth * 0.6); // Peak of the bend, remains the same
        float bendWidth = peakBend - startBend; // Width of the bending area up to the peak
        float endBend = 2.0 + (-pageWidth * 0.2); // Extend the end point of the bend further right
       

        //Apply the bend effect within the specified range
        if (pos.x > startBend && pos.x < endBend) {
            float normalizedBendPos = (pos.x - startBend) / bendWidth;
            float bendAmount = 0.0;

            if (pos.x <= peakBend) {
                bendAmount = bendIntensity * sin(3.14159265 * normalizedBendPos / 2.0);
            } else {
                float extendedBendWidth = endBend - peakBend;
                float extendedNormalizedPos = (pos.x - peakBend) / extendedBendWidth;
                bendAmount = bendIntensity * (1.0 - extendedNormalizedPos) * sin(3.14159265 / 2.0);
            }

            // Determine bend direction based on the page rotation and turn progress
            float bendDirection = turnDirection > 0.0 ? 
            (rotationY < -3.14159265 / 2.0 ? 1.0 : -1.0) : 
            (rotationY > -3.14159265 / 2.0 ? 1.0 : -1.0);


            // Interpolate bend direction based on turn progress
            float interpolatedBend = mix(bendDirection, -bendDirection, turnProgress);

            // Apply the bend along the Z axis
            pos.z += bendAmount * interpolatedBend;
        }


        // Calculate the curl angle based on the turn progress        
        float curlProgress;
        float maxCurlAngle = 1.54159265; // Full circle for complete curl
        float curlAngle = maxCurlAngle * (pos.x - foldLine) / (pageWidth - 0.5);
        float curlPeakProgress = 0.46; // Peak of the curl
        float uncurlEndProgress = 0.8; // End of the uncurling phase
        float reverseCurlEndProgress = 0.94; // End of the reverse curl phase
        float flatStartProgress = 0.99; // End of the flat phase
        float turnEndProgress = 1.0;   // End of the turn

        
        if (turnProgress <= curlPeakProgress) {
          curlProgress = (turnProgress / curlPeakProgress);
          // Adjusting the intensity of the curl based on the vertical position
          float adjustedCurl = 1.0 - (0.2 * verticalPosition); // More curl at the bottom
          curlProgress *= adjustedCurl;
        } else if (turnProgress <= uncurlEndProgress) {
          // Uncurl phase - Return to flat
          curlProgress = 1.0 - (turnProgress - curlPeakProgress) / (uncurlEndProgress - curlPeakProgress);
          float adjustedUncurl = 1.0 - (0.2 * verticalPosition); // More uncurl at the bottom
          curlProgress *= adjustedUncurl;
        } else if (turnProgress < reverseCurlEndProgress) {
          // Reverse curl phase
          float reverseCurlProgress = (turnProgress - uncurlEndProgress) / (reverseCurlEndProgress - uncurlEndProgress);
          curlProgress = reverseCurlProgress * 0.1; // Adjust for the extent of the reverse curl
          curlAngle *= -0.1; // Reverse the curl direction
        } else if (turnProgress < flatStartProgress) {
          // Flat phase - Return to flat
          float reverseFlattenProgress = (turnProgress - reverseCurlEndProgress) / (turnEndProgress - reverseCurlEndProgress);
          curlProgress = (1.0 - reverseFlattenProgress) * -0.1;
        }

        if (turnDirection < 0.0) {
        curlAngle = -curlAngle;
        }
        
        // Apply the adjusted curl progress to the curl angle
        curlAngle *= curlProgress ;
        
        // Apply the curl to vertices on the right side of the fold line
        if (pos.x > foldLine) {
            pos.x = foldLine + cos(curlAngle) * distanceFromFold;
            pos.z += sin(curlAngle) * distanceFromFold;
        }
        

        // Transform the vertex by the model-view-projection matrix
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `;
  
    const fragmentShader = `
      uniform vec3 color;
      uniform sampler2D frontTexture;
      uniform sampler2D backTexture;
      uniform int useTexture;
      varying vec2 vUv;
            
      void main() {
        vec2 uv = vUv;

        if (!gl_FrontFacing) {
          uv.x = 1.0 - uv.x;  // Reverse the U coordinate for the back face
        }

        if(useTexture == 1) {
          if (gl_FrontFacing) {
            gl_FragColor = texture2D(frontTexture, uv);
          } else {
            gl_FragColor = texture2D(backTexture, uv);
          }
        } else {
          gl_FragColor = vec4(color, 1.0);
        }
      }
    `;


    const pages: THREE.Object3D[] = [];
    const pagePivots: THREE.Object3D[] = [];
 
    // Create the pages
    for (let i = 0; i <= 20; i++) {
      const pageGeometry = new THREE.PlaneGeometry(6.4, 7.8, 50, 50);
      const pageUniform = {
        useTexture: {value: i ===0 ? 1 : 0},
        color: { value: new THREE.Color(`hsl(${i * 60}, 100%, 50%)`) },
        turnProgress: {value: 0.0},
        pageWidth: {value: 6.4},
        pageHeight: {value: 7.8},
        rotationY: {value: 0.0},
        bendIntensity: { value: 0.0},
        turnDirection: { value: 0.0},
      };
      
      const pageMaterial = new THREE.ShaderMaterial({
        uniforms: pageUniform,
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        side: THREE.DoubleSide,
      });
      const page = new THREE.Mesh(pageGeometry, pageMaterial);


   
      // Create a pivot for each page at the left edge
      const pivotPage = new THREE.Object3D();
      page.position.set(3.2, 0,(0.001 * (4 - i)));
      pivotPage.add(page);
      pages.push(page);
      pagePivots.push(pivotPage); // Store the pivot
      pageAnimationFlags.current = pagePivots.map(() => false);

    }
    pivotSpine.add(...pagePivots);
    
    // Second cover
    const cover2 = new THREE.Mesh(coverGeometry, coverMaterial);
    const pivot2 = new THREE.Object3D();
    cover2.position.x = 0;
    cover2.position.z = 0;
    pivot2.add(cover2);
    scene.add(pivot2);

    // Store the initial positions and rotations
    initialPivotRotationY.current = pivot.rotation.y;
    initialPivotPositionX.current = pivot.position.x;
    initialPivotPositionZ.current = pivot.position.z;
    initialSpineRotationY.current = spine.rotation.y;
    initialSpinePositionX.current = spine.position.x;
    initialSpinePositionZ.current = spine.position.z;
    initialPagePivotXPositions.current = pagePivots.map(pivot => pivot.position.x);

    return [pivot,pivot2, pivotSpine, spine, pages, pagePivots];

  }


  function handleScrollAnimations( 
    camera: THREE.PerspectiveCamera, 
    scene: THREE.Scene, 
    pivot: THREE.Object3D, 
    pivot2: THREE.Object3D,
    pivotSpine: THREE.Object3D, 
    spine: THREE.Mesh, 
    pages: THREE.Object3D[], 
    pagePivots: THREE.Object3D[],
    renderer: THREE.WebGLRenderer) {
      if (!containerRef.current) return;
      
       // Handle opening and closing the book cover
  if (currentPage.current === 1 && pageTurnDirection.current === 'forward') {
    openBookCover();
  } else if (currentPage.current === 0 && pageTurnDirection.current === 'backward') {
    closeBookCover();
  }

  // Handle turning pages
  if (pageTurnDirection.current === 'forward') {
    // Turn the current page
    const pageIndex = currentPage.current - 2; // -2 because the cover is page 0
    if (pageIndex >= 0 && pageIndex < pagePivots.length) {
      const pagePivot = pagePivots[pageIndex];
      const shaderMaterial = (pagePivot.children[0] as THREE.Mesh).material as THREE.ShaderMaterial;
      turnPage(pagePivot, shaderMaterial, pageIndex);
    }
  } else if (pageTurnDirection.current === 'backward') {
    // Reverse turn the page before the current one
    const pageIndex = currentPage.current - 1; // -1 because the cover is page 0
    if (pageIndex >= 0 && pageIndex < pagePivots.length) {
      const pagePivot = pagePivots[pageIndex];
      const shaderMaterial = (pagePivot.children[0] as THREE.Mesh).material as THREE.ShaderMaterial;
      reverseTurnPage(pagePivot, shaderMaterial, pageIndex);
    }
  }

  // Reset the page turn direction after processing
  pageTurnDirection.current = 'none';

    function openBookCover() {
      console.log("isCoverAnimating", isCoverAnimating.current);
      if (isCoverAnimating.current) return; // Exit if already animating

      isCoverAnimating.current = true;
      const totalRotationRange = Math.PI - (-Math.PI);
      const finalPivotRotationY = -Math.PI; // Fully open
      const progress = (pivot.rotation.y + Math.PI) / totalRotationRange;
      const finalPivotPositionX = Math.max(-3.80);
      const finalPivotPositionZ = Math.max(0);
      
      const finalSpineRotationY = -Math.PI;
      const finalSpinePositionX =Math.max(-0.25);
      const finalSpinePositionZ =Math.max(-0.25);
      const coverWidth = 6.5;  // Width of the book cover
      const spineWidth = 0.5;  // Width of the spine

      const currentBookWidth = coverWidth + spineWidth + coverWidth * progress;

      // Calculate the total width of the book when fully opened
      const totalOpenBookWidth = 2 * coverWidth + spineWidth;

      // Calculate the difference in width as the book opens
      const widthDifference = totalOpenBookWidth - currentBookWidth;
      const finalScenePositionX =  widthDifference;
          
      // Create a GSAP timeline
      const tl = gsap.timeline({ ease: "power3.inOut" });
      const tl2 = gsap.timeline({ ease: "power3.inOut" });
      tl.to(pivot.rotation, { y: finalPivotRotationY, duration: 3 }, 0);
      tl.to(pivot.position, {
        x: finalPivotPositionX,
        z: finalPivotPositionZ,
        duration: 3,
        onUpdate: () => {
          // Updated curve progress calculation
          const curveProgress = 2 * (pivot.rotation.y - (-Math.PI)) / Math.PI;
          const baseBendIntensity = 0.0005;
          const currentBendIntensity = baseBendIntensity * Math.max(0, curveProgress);  // Ensure it doesn't go below 0
            
          pagePivots.forEach((pagePivot) => {
            const shaderMaterial = (pagePivot.children[0] as THREE.Mesh).material as THREE.ShaderMaterial;
            shaderMaterial.uniforms.bendIntensity.value += currentBendIntensity;
            shaderMaterial.needsUpdate = true;
          });

          pagePivots.forEach((pagePivot, index) => {
            if (index !== pagePivots.length - 1) {
              // Calculate and apply the offset based on progress
              const offset = (0.00009 * (pagePivots.length - 1 - index) * progress);
              pagePivot.position.x += initialPagePivotXPositions.current[index] - offset;
            }
          });
        },
       
      }, 0);

      tl.to(scene.position, {
        x: finalScenePositionX,
        duration: 3,
       
      }, 0);

      tl2.to(spine.rotation, { y: finalSpineRotationY, duration: 2.85 }, 0);
      tl.to(spine.position, {
        x: finalSpinePositionX,
        z: finalSpinePositionZ,
        duration: 2.85,
        
      }, 0);
      const masterTimeline = gsap.timeline();
      masterTimeline.add(tl, "start")
                    .add(tl2, "start+=0.1");
      isCoverAnimating.current = false;
    }

    function closeBookCover() {
      if (isCoverAnimating.current) return; 
      const totalRotationRange = Math.PI - (-Math.PI); // Correct total rotation range
      const reverseProgress = (initialPivotRotationY.current - pivot.rotation.y) / totalRotationRange;

    
      isCoverAnimating.current = true;
      
      const tl = gsap.timeline({ ease: "power3.inOut" });
      const tl2 = gsap.timeline({ ease: "power3.inOut" });
    
      tl.to(pivot.rotation, { y: initialPivotRotationY.current, duration: 3 }, 0);
      tl.to(pivot.position, { x: initialPivotPositionX.current, z: initialPivotPositionZ.current, duration: 3, onUpdate: () => {
        const reverseCurveProgress = 1 - ((pivot.rotation.y + Math.PI) / (Math.PI - (-Math.PI)));
      const baseBendIntensity = 0.0005;
      const reversedBendIntensity = baseBendIntensity * Math.max(0, reverseCurveProgress);

      // Apply reversed bend intensity and position offset
      pagePivots.forEach((pagePivot, index) => {
        const shaderMaterial = (pagePivot.children[0] as THREE.Mesh).material as THREE.ShaderMaterial;

        // Reverse bend intensity
        shaderMaterial.uniforms.bendIntensity.value -= reversedBendIntensity;
        shaderMaterial.needsUpdate = true;

      });

      pagePivots.forEach((pagePivot, index) => {
        if (index !== pagePivots.length - 1) {
          // Calculate and apply the reverse offset based on reverse progress
          const offset = 0.00009 * (pagePivots.length - 1 - index) * reverseProgress;
          pagePivot.position.x -= initialPagePivotXPositions.current[index] - offset;
        }
      });

      } }, 0);
      tl.to(scene.position, { x: 0, duration: 3 }, 0);  // Assuming initial position was 0
    
      tl2.to(spine.rotation, { y: initialSpineRotationY.current, duration: 2.85 }, 0);
      tl.to(spine.position, { x: initialSpinePositionX.current, z: initialSpinePositionZ.current, duration: 2.85 }, 0);
    
      const masterTimeline = gsap.timeline();
      masterTimeline.add(tl, "start").add(tl2, "start+=0.1");
      isCoverAnimating.current = false;
    }
    



    // Function to handle the page turning
    function turnPage(pagePivot: THREE.Object3D, shaderMaterial: THREE.ShaderMaterial, pageIndex: number) {
  
      if (pageAnimationFlags.current[pageIndex]) {
        return;
      }
    
      pageAnimationFlags.current[pageIndex] = true;
      shaderMaterial.uniforms.turnProgress.value = 0;
      shaderMaterial.uniforms.turnDirection.value = 1.0;
      const pageTurnDuration = 1; // Consistent duration for page turn

      let tl = gsap.timeline({ onUpdate: updateScene });
     
  
      tl.to(pagePivot.rotation, { 
          y: -Math.PI, 
          duration: pageTurnDuration, 
          ease: "power2.inOut",
      });
      tl.to(shaderMaterial.uniforms.turnProgress, { 
          value: 1, 
          duration: pageTurnDuration, 
          ease: "power2.inOut" ,
      }, 0);
      shaderMaterial.uniforms.rotationY.value = pivot.rotation.y;
      pageAnimationFlags.current[pageIndex] = false;
  }

  function reverseTurnPage(pagePivot: THREE.Object3D, shaderMaterial: THREE.ShaderMaterial, pageIndex: number) {
    console.log("reverseTurnPage")
    if (pageAnimationFlags.current[pageIndex]) return;
    pageAnimationFlags.current[pageIndex] = true;
    shaderMaterial.uniforms.turnProgress.value = 0.0;
    shaderMaterial.uniforms.turnDirection.value = -1.0;
     const pageTurnDuration = 1; 
 
    let tl = gsap.timeline({ onUpdate: updateScene });
  
    tl.to(pagePivot.rotation, { 
        y: 0,  // Rotate back to initial state
        duration: pageTurnDuration, 
        ease: "power2.inOut",
    });
    tl.to(shaderMaterial.uniforms.turnProgress, { 
        value: 1, 
        duration: pageTurnDuration, 
        ease: "power2.inOut",
    }, 0);
    shaderMaterial.uniforms.rotationY.value = pivot.rotation.y;
    pageAnimationFlags.current[pageIndex] = false;
  }
  
  

    // Consolidated scene update function to be called by GSAP onUpdate
    function updateScene() {
      renderer.render(scene, camera);
    }
  }



  return <div className="container" ref={containerRef} style={{ position: "fixed", top: "0", left: "0" }}>
  <div className="prev-arrow" style={{ position: "absolute", left: "15%", top: "5%", cursor: "pointer", zIndex:"1000", backgroundColor: "red" }}>←</div>
  <div className="next-arrow" style={{ position: "absolute", right: "15%", top: "5%", cursor: "pointer", zIndex: "1000", backgroundColor: "red" }}>→</div>
  </div>;
};

export default Book;