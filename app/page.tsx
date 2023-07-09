"use client"
import { useRef, useState, useEffect } from "react";
import "./book.css"

export default function Home() {
  // Ref for the book container
  const bookContainerRef = useRef<HTMLDivElement | null>(null);
  // Ref for the book
  const bookRef = useRef<HTMLDivElement | null>(null);
  // State for the book's right property
  const [bookRight, setBookRight] = useState(0);
  // State for page rotations
  const [pageRotations, setPageRotations] = useState(new Array(12).fill(0));

  useEffect(() => {
    const handleScroll = () => {
      if (bookContainerRef.current) {
        // Get the vertical scroll position
        const scrollY = window.scrollY || window.pageYOffset;
        // Get the total scrollable height (document height - window height)
        const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
        // Calculate scroll percentage (how much of the scrollable area has been scrolled)
        const bookSlide = scrollY / (scrollableHeight * 0.05);

        // For book sliding
        const bookRect = bookContainerRef.current.children[0].children[0].getBoundingClientRect();
        const bookWidth = bookRect ? (bookRect.width / window.innerWidth) * 100 : 0;
        const maxRight = Math.max(0, 25 - bookWidth);
        const newBookRight = Math.min(maxRight, bookSlide * maxRight);

        // For page flipping
        //divide by 1 extra page so that initial page doesnt return to initial position, fix glitch
        // number od pages
        const totalPages = 12;
        // the amount of scroll needed to flip a page (height of the container / number of pages)
        const scrollPerFlip = scrollableHeight / totalPages;
        // calculate which page is currently flipping
        const flippingPage = Math.min(Math.floor(scrollY / scrollPerFlip), totalPages - 1);
        // progress of the page that is currently being flipped
        const flipProgress = (scrollY % scrollPerFlip) / scrollPerFlip;
        // calculate the rotation of the page that is currently being flipped
        const newRotation = flipProgress * (180 - flippingPage); // Subtract page index from 180 to have a layer effect
        

        // Update the book's right property
        setBookRight(newBookRight);
        // Update the page rotations
        // if the page is not currently being flipped, set its rotation to 0, otherwise set its rotation to the new rotation,
        //  so that the next page will be flipped only when the current page is completely flipped
        setPageRotations(prev => prev.map((rotation, index) =>
          index === flippingPage ? newRotation : (index < flippingPage ? 180 - (index /10) : 0)
        ));
      }
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className='book-container' ref={bookContainerRef}>
      <div className="stickyDiv">
        <div className="stickyContent">
          <div className="book" ref={bookRef} style={{right: `${-bookRight}vw`}}>
            <div className="back">
              <div className="front-side"></div>
              <div className="back-side"></div>
            </div>
            <div className="page10" style={{transform: `rotateY(${-pageRotations[10]}deg)`}}></div>
            <div className="page9" style={{transform: `rotateY(${-pageRotations[9]}deg)`}}></div>
            <div className="page8" style={{transform: `rotateY(${-pageRotations[8]}deg)`}}></div>
            <div className="page7" style={{transform: `rotateY(${-pageRotations[7]}deg)`}}></div>
            <div className="page6" style={{transform: `rotateY(${-pageRotations[6]}deg)`}}></div>
            <div className="page5" style={{transform: `rotateY(${-pageRotations[5]}deg)`}}></div>
            <div className="page4" style={{transform: `rotateY(${-pageRotations[4]}deg)`}}></div>
            <div className="page3" style={{transform: `rotateY(${-pageRotations[3]}deg)`}}></div>
            <div className="page2" style={{transform: `rotateY(${-pageRotations[2]}deg)`}}></div>
            <div className="page1"style={{transform: `rotateY(${-pageRotations[1]}deg)`}}></div>
            <div className="front" style={{transform: `rotateY(${-pageRotations[0]}deg)`}}>
              <div className="front-side"></div>
              <div className="back-side"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
