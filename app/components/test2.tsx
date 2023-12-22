import gsap from "gsap";
import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { FaArrowCircleRight,FaArrowCircleLeft } from "react-icons/fa";


interface VideoTextureWithElement {
  texture: THREE.Texture;
  video: HTMLVideoElement;
  pageIndex: number; 
}

const Book: React.FC = () => {
  // reference to the container div
  const containerRef = useRef<HTMLDivElement>(null);
  // const scrollDirection = useRef(0);
  const currentPage = useRef(0);

  // Ref states for managing animation
  const isCoverAnimating = useRef(false);
  const pageAnimationFlags = useRef<boolean[]>([]);
  const pageTurnDirection = useRef<'forward' | 'backward' | 'none'>('none');
  const videoTexturesRef = useRef<VideoTextureWithElement[]>([]);

  const bookState = useRef(0);


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
        handleScrollAnimations(camera, scene, pivot, spine, pagePivots, renderer);
        renderer.render(scene, camera);
           
      };
      // handle the screen size change
      const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setPixelRatio(window.devicePixelRatio); // Add this line
        renderer.setSize(window.innerWidth, window.innerHeight);
      };

      window.addEventListener('resize', handleResize)
      // next page handling
      const handleNextPage = () => {
        if (bookState.current < pagePivots.length + 1) { // +1 for the cover
          pageTurnDirection.current = 'forward';
          bookState.current++;
        }
      };
      // previous page handling
      const handlePreviousPage = () => {
        if (bookState.current > 0) {
          pageTurnDirection.current = 'backward';
          bookState.current--;
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
      varying vec2 vUvVid;

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

        // Pass the texture coordinates to the fragment shader for the video texture
            vUvVid = uv;
      }
    `;
  
    const fragmentShader = `
      uniform sampler2D videoTexture;
      uniform float useVideo; // 1.0 for video, 0.0 for color
      uniform vec3 color; // Color for non-video pages
      
      varying vec2 vUv;
      
      void main() {
        vec2 uv = vUv;
        if (useVideo > 0.5) {
            gl_FragColor = texture2D(videoTexture, uv);
        } else {
            // Use a solid color for non-video pages
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
        useVideo: { value: 0 },
        color: { value: new THREE.Color(`hsl(${i * 60}, 100%, 50%)`) }, // Default color
        turnProgress: {value: 0.0},
        pageWidth: {value: 6.4},
        pageHeight: {value: 7.8},
        rotationY: {value: 0.0},
        bendIntensity: { value: 0.0},
        turnDirection: { value: 0.0},
        videoTexture: { value: new THREE.Texture() },
      };
      
      const pageMaterial = new THREE.ShaderMaterial({
        uniforms: pageUniform,
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        side: THREE.DoubleSide,
      });
      const page = new THREE.Mesh(pageGeometry, pageMaterial);

      // Create video texture for the first two pages
      if (i === 1) { // For the first video page
        pageUniform.useVideo.value = 1;
        pageUniform.videoTexture.value = createVideoTexture('/videos/Teller-Matriarca.mp4', i);
      } else if (i === 2) { // For the second video page
        pageUniform.useVideo.value = 1;
        pageUniform.videoTexture.value = createVideoTexture('/videos/Teller-Estórias.mp4', i);
      }
 
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

  function createVideoTexture(videoSrc: string, pageIndex: number): THREE.Texture {
     // Create video element
    const video = document.createElement('video');
    video.src = videoSrc;
    video.crossOrigin = "anonymous"; 
    video.loop = true;
    video.muted = true;
    video.play();
    
    // Create canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
        throw new Error('Unable to get 2D context');
    }
    canvas.width = 1024;
    canvas.height = 1024;

    // Create texture
    const videoTexture = new THREE.Texture(canvas);

    // Function to update texture
    function updateTexture(): void {
      if (video.readyState >= video.HAVE_CURRENT_DATA) {
        if(context) {
          context.clearRect(0, 0, canvas.width, canvas.height);
          // Calculate the scale and position to maintain aspect ratio
          const videoAspect = video.videoWidth / video.videoHeight;
          const canvasAspect = canvas.width / canvas.height;
          let renderWidth, renderHeight, offsetX, offsetY;

          if (canvasAspect > videoAspect) {
              // Canvas is wider than video
              renderHeight = canvas.height;
              renderWidth = videoAspect * renderHeight;
              offsetX = (canvas.width - renderWidth) / 2;
              offsetY = 0;
          } else {
              // Canvas is taller than video
              renderWidth = canvas.width - (2 * 20);
              renderHeight = renderWidth / videoAspect;
              offsetX = 20;
              offsetY = (canvas.height - renderHeight) / 2;
          }

          context.drawImage(video, offsetX, offsetY, renderWidth, renderHeight);
          videoTexture.needsUpdate = true;
        }
      }
        requestAnimationFrame(updateTexture);
    }
    // Start updating the texture
    updateTexture();

    const videoTextureObject = { texture: videoTexture, video: video, pageIndex: pageIndex };
    videoTexturesRef.current.push(videoTextureObject);

    return videoTexture;
  }

  function handleVideoOnPage(pageIndex: number) {
    videoTexturesRef.current.forEach(videoTexture => {
      if (videoTexture.pageIndex === pageIndex) {
        // Play video on the current page
        videoTexture.video.play();
      } else {
        // Pause videos on all other pages
        videoTexture.video.pause();
      }
    });
  }

  function handleScrollAnimations( 
    camera: THREE.PerspectiveCamera, 
    scene: THREE.Scene, 
    pivot: THREE.Object3D, 
    spine: THREE.Mesh,  
    pagePivots: THREE.Object3D[],
    renderer: THREE.WebGLRenderer) {
      if (!containerRef.current) return;
     
      // Handle opening and closing the book cover
      if (bookState.current === 1 && pageTurnDirection.current === 'forward') {
        openBookCover();
      } else if (bookState.current === 0 && pageTurnDirection.current === 'backward') {
        closeBookCover();
      }

      // Handle turning pages
      if(bookState.current >=2 || currentPage.current === 1){
        if (pageTurnDirection.current === 'forward') {
          // Turn the current page
          // -2 because the cover is page 0
            const pagePivot = pagePivots[currentPage.current];
            const shaderMaterial = (pagePivot.children[0] as THREE.Mesh).material as THREE.ShaderMaterial;
            turnPage(pagePivot, shaderMaterial, currentPage.current);
            currentPage.current++;
        } else if (pageTurnDirection.current === 'backward') {
        // Reverse turn the page before the current one
          const pagePivot = pagePivots[currentPage.current- 1];
          const shaderMaterial = (pagePivot.children[0] as THREE.Mesh).material as THREE.ShaderMaterial;
          reverseTurnPage(pagePivot, shaderMaterial, currentPage.current);
          currentPage.current--;
        }
      }

      // Reset the page turn direction after processing
      pageTurnDirection.current = 'none';

      function openBookCover() {
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
        const totalRotationRange = Math.PI - (-Math.PI); 
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
            onComplete: () => {
              // Update index of current turned page
              handleVideoOnPage(pageIndex + 1)
            }
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
            onComplete: () => {
              // Update index of current turned page
              handleVideoOnPage(pageIndex - 1);
          }
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

  return <div className="bookContainer" ref={containerRef}>
  <div className="prev-arrow" style={{ position: "absolute", left: "15%", top: "25%", cursor: "pointer", zIndex:"1000", backgroundColor: "red" }}><FaArrowCircleLeft /></div>
  <div className="next-arrow" style={{ position: "absolute", right: "15%", top: "5%", cursor: "pointer", zIndex: "1000", backgroundColor: "red" }}><FaArrowCircleRight /></div>
  </div>;
};

export default Book;