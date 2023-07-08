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


  useEffect(() => {
    const handleScroll = () => {
      if (bookContainerRef.current) {
        //Get the vertical scroll position
        const scrollY = window.scrollY || window.pageYOffset;
        // Get the total scrollable height (document height - window height)
        const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
        // Calculate scroll percentage (how much of the scrollable area has been scrolled)
        const scrollPercentage = scrollY / scrollableHeight;
        // Get the width of the book
        const bookRect = bookContainerRef.current.children[0].children[0].getBoundingClientRect();
        // Calculate the width of the book as a percentage of the window width
        const bookWidth = bookRect ? (bookRect.width / window.innerWidth) * 100 : 0;
        // Calculate the maximum right value
        const maxRight = Math.max(0, 25 - bookWidth);
        // Calculate the new right value
        const newBookRight = Math.min(maxRight, scrollPercentage * maxRight);
  
        // Update the book's right property
        setBookRight(newBookRight);
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
            <div className="page10"></div>
            <div className="page9"></div>
            <div className="page8"></div>
            <div className="page7"></div>
            <div className="page6"></div>
            <div className="page5"></div>
            <div className="page4"></div>
            <div className="page3"></div>
            <div className="page2"></div>
            <div className="page1"></div>
            <div className="front">
              <div className="front-side"></div>
              <div className="back-side"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
