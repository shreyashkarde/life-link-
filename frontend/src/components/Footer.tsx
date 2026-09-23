import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <div className="md:mx-10 mt-20">
      <div className="flex flex-col sm:grid grid-cols-[3fr_1fr_1fr] gap-14 my-10 text-sm">
        {/* Left Section */}
        <div>
          <div className="flex items-center gap-2.5 mb-5">
            <img
              src="/lifelink_logo.png"
              alt="LifeLink Logo"
              className="w-9 h-9 object-contain rounded-full shadow-xs"
            />
            <div className="flex flex-col">
              <span className="text-2xl font-black tracking-tight text-gray-900 flex items-center leading-none">
                <span className="text-blue-600">Life</span>Link
              </span>
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest -mt-0.5">
                CARE CONNECTS LIVES
              </span>
            </div>
          </div>
          <p className="w-full md:w-2/3 text-gray-600 leading-6">
            LifeLink Healthcare is committed to excellence in modern medical delivery. We connect patients with
            trusted, certified medical professionals and real-time emergency ambulance telemetry whenever you need it.
          </p>
        </div>

        {/* Center Section */}
        <div>
          <p className="text-xl font-medium mb-5 text-gray-900">COMPANY</p>
          <ul className="flex flex-col gap-2 text-gray-600">
            <Link to="/" className="hover:text-primary transition-colors">Home</Link>
            <Link to="/about" className="hover:text-primary transition-colors">About us</Link>
            <Link to="/contact" className="hover:text-primary transition-colors">Contact us</Link>
            <Link to="/about" className="hover:text-primary transition-colors">Privacy policy</Link>
          </ul>
        </div>

        {/* Right Section */}
        <div>
          <p className="text-xl font-medium mb-5 text-gray-900">GET IN TOUCH</p>
          <ul className="flex flex-col gap-2 text-gray-600">
            <li>+1-212-456-7890</li>
            <li>support@lifelink.com</li>
          </ul>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-gray-200">
        <p className="py-5 text-sm text-center text-gray-500">
          Copyright 2026 @ LifeLink - All Rights Reserved.
        </p>
      </div>
    </div>
  );
};

export default Footer;
