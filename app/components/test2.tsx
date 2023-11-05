import React, { useEffect, useRef } from "react";
import * as THREE from "three";


const Book: React.FC = () => {
  // reference to the container div
  const containerRef = useRef<HTMLDivElement>(null);
  // const scrollDirection = useRef(0);
  const currentPage = useRef(0);

  useEffect(() => {
    if (!containerRef.current) return;

      // Create scene, camera, and renderer
      const scene = initializeScene();
      const camera = initializeCamera();
      const renderer = initializeRenderer(containerRef.current);

      const [pivot, pivotSpine, spine, pages, pagePivots] = initializeBook(scene);

      const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setPixelRatio(window.devicePixelRatio); // Add this line
        renderer.setSize(window.innerWidth, window.innerHeight);
      };

      window.addEventListener('resize', handleResize)

      const animate = () => {
          
        requestAnimationFrame(animate);
        handleScrollAnimations(camera, scene, pivot, pivotSpine,spine, pages,pagePivots );
        renderer.render(scene, camera);
      };

      const handlePreviousPage = () => {
        if (currentPage.current === 1) {
          // Close the book cover if we're at the first page
          currentPage.current--;
        } else if (currentPage.current > 0) {
          // Revert one page on each subsequent click
          currentPage.current--;
        }
      };
      
    

      const handleNextPage = () => {
        if (currentPage.current === 0) {
          // Open the book cover on the first click
          currentPage.current++;
        } else if (currentPage.current < pagePivots.length + 1) { // Add 1 to account for the last page
          // Turn one page on each subsequent click
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
    camera.position.z = 15;
    // camera.position.x = -3;
    // camera.position.y = -15;
    // camera.rotateX(1.2)
    return camera;
  }

  function initializeRenderer(container: HTMLDivElement): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);
    return renderer;
  }


  

  function initializeBook(scene: THREE.Scene): [THREE.Object3D, THREE.Object3D, THREE.Mesh,THREE.Object3D[], THREE.Object3D[]] {
    const coverGeometry = new THREE.BoxGeometry(6.5, 8, 0.1);
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
    const vertexShader = `
      varying vec2 vUv;
      uniform float peelProgress;  // 0.0 to 1.0 - 0.0 is unpeeled, 1.0 is fully peeled
      uniform float curlStrength; // 0.0 to 1.0
      void main() {
        vUv = uv;
        vec3 pos = position;

        float normalizedX = -(pos.x - 3.25) / 6.5;
        
        if (normalizedX < 0.7 ) {
          float quadraticValue = (normalizedX - 0.7) * (normalizedX - 0.7) * 4.0;
          pos.z += quadraticValue * curlStrength * (1.0 - peelProgress);  // Adjust curlStrength and peelProgress to control the peel effect
        }


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
 
    for (let i = 0; i <= 4; i++) {
      const pageGeometry = new THREE.PlaneGeometry(6.4, 7.8, 50, 50);
      const pageUniform = {
        useTexture: {value: i ===0 ? 1 : 0},
        color: { value: new THREE.Color(`hsl(${i * 60}, 100%, 50%)`) },
        peelProgress: { value: 0.0 },
        curlStrength: { value: 0.0},
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
      page.position.set(3.2, 0,(0.01 * (4 - i)));
      pivotPage.position.set(0, 0, 0.1);
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

    return [pivot, pivotSpine, spine, pages, pagePivots];

  }

  function handleScrollAnimations( 
    camera: THREE.PerspectiveCamera, 
    scene: THREE.Scene, 
    pivot: THREE.Object3D, 
    pivotSpine: THREE.Object3D, 
    spine: THREE.Mesh, 
    pages: THREE.Object3D[], 
    pagePivots: THREE.Object3D[]) {
    if (!containerRef.current) return;
    

    // Logic for closing the book cover
    if (currentPage.current === 0) {
      if (pivot.rotation.y < 0) {
          pivot.rotation.y += 0.05;
          
          // Adjust the cover's z and x position to revert back to original position
          pivot.position.z += 0.008;
          pivot.position.x += 0.008;
          // spine.position.x += 0.004;
          // spine.position.z += 0.004;
          // scene.position.x -= 0.055;
      } else {
          pivot.rotation.y = 0;
      }

      // Revert spine rotation to original
      if (pivot.rotation.y >= -Math.PI / 2) {
          spine.rotation.y = (Math.PI + pivot.rotation.y) * 0.5; 
      }
    }

    // Logic for opening the book cover
    if (currentPage.current === 1) {
      if (pivot.rotation.y > -Math.PI) {
          pivot.rotation.y -= 0.05;
  
          // Adjust the cover's z position to make it look realistic
          pivot.position.z -= 0.008;
          pivot.position.x -= 0.008;
          // Adjust the spine's x and z position to make it sync with the cover
          spine.position.x -= 0.004;
          spine.position.z -= 0.004;
          // Adjust the scene's x position to make center the book in the scene
          scene.position.x += 0.055;
          
      } else {
          pivot.rotation.y = -Math.PI;
          const lastPageIndex = pagePivots.length - 1;
          // Get the position of the last page to use a reference
          const referencePositionX = pagePivots[lastPageIndex].position.x; 
          pagePivots.forEach((pagePivot, index) => {
              // Check if it's not the last page
              if (index !== lastPageIndex) {
                  // Define the offset based on the page position in the stack
                  const offset = 0.009 * (lastPageIndex - index); 
                  pagePivot.position.x = referencePositionX - offset;
              }
          });
      }
  
      // Start rotating spine once cover is at 90 degrees (-PI/2)
      if (pivot.rotation.y <= -Math.PI / 2) {
          spine.rotation.y = (Math.PI + pivot.rotation.y) * 0.5; 
      }
    }

    

    for (let i = 0; i < pagePivots.length; i++) {
      const pagePivot = pagePivots[i];
      const shaderMaterial = (pagePivot.children[0] as THREE.Mesh).material as THREE.ShaderMaterial;
      if (i < currentPage.current - 1) {
        if (shaderMaterial.uniforms.curlStrength.value <= 0.7) {
          shaderMaterial.uniforms.peelProgress.value += 0.02;  // Example value, adjust as needed
          shaderMaterial.uniforms.curlStrength.value += 0.02;
        } else if ( pagePivot.rotation.y > -Math.PI) {
          // Start rotating the page once the peeling effect is complete
          pagePivot.rotation.y -= 0.01;
        }
        shaderMaterial.needsUpdate = true;
      }
    }
    
  }



  return <div className="container" ref={containerRef} style={{ position: "fixed", top: "0", left: "0" }}>
  <div className="prev-arrow" style={{ position: "absolute", left: "15%", top: "5%", cursor: "pointer", zIndex:"1000", backgroundColor: "red" }}>←</div>
  <div className="next-arrow" style={{ position: "absolute", right: "15%", top: "5%", cursor: "pointer", zIndex: "1000", backgroundColor: "red" }}>→</div>
</div>;
};

export default Book;