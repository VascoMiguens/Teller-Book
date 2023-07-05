import "./book.css"

export default function Home() {
  return (
    <div className='book-container'>
      <div className="book">
        <div className="back">
          <div className="front-side"></div>
          <div className="back-side"></div>
        </div>
        <div className="front">
          <div className="front-side"></div>
          <div className="back-side"></div>
        </div>
      </div>
    </div>
  )
}
