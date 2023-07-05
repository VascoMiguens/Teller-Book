import "./sidebar.css";
import Link from "next/link";
import {FaInstagram, FaTwitter,FaYoutube, FaSpotify, FaApple } from "react-icons/fa";

const Sidebar = () => {
    return(
    <div className="sidebar">
        <div className="socials">
            <Link href="">
                <FaInstagram />
            </Link>
            <Link href="">
                <FaTwitter />
            </Link>
            <Link href="">
                <FaYoutube />
            </Link>
            <Link href="">
                <FaSpotify />
            </Link>
            <Link href="">
                <FaApple />
            </Link>
        </div>
    </div>
    );
}
export default Sidebar; 