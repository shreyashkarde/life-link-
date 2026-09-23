import React from 'react';
import { assets } from '../assets/assets';

export const About: React.FC = () => {
  return (
    <div>
      <div className="text-center text-2xl pt-10 text-gray-500">
        <p>
          ABOUT <span className="text-gray-700 font-semibold">US</span>
        </p>
      </div>

      <div className="my-10 flex flex-col md:flex-row gap-12">
        <img
          className="w-full md:max-w-[360px] rounded-2xl object-cover shadow-sm"
          src={assets.about_image}
          alt="About LifeLink"
        />
        <div className="flex flex-col justify-center gap-6 md:w-2/4 text-sm text-gray-600 leading-7">
          <p>
            Welcome to LifeLink, your trusted partner in managing your healthcare needs
            conveniently and efficiently. At LifeLink, we understand the challenges individuals face
            when it comes to scheduling doctor appointments, emergency ambulance dispatch, and managing health records.
          </p>
          <p>
            LifeLink is committed to excellence in healthcare technology. We continuously strive to
            enhance our platform, integrating the latest advancements in real-time telemetry to improve user experience and
            deliver superior service. Whether you're booking your first appointment or requesting emergency support,
            LifeLink is here to support you every step of the way.
          </p>
          <b className="text-gray-800 text-base">Our Vision</b>
          <p>
            Our vision at LifeLink is to create a seamless healthcare and emergency response experience for every user. We
            aim to bridge the gap between patients, healthcare providers, and emergency responders, making it easier for you
            to access life-saving care whenever you need it.
          </p>
        </div>
      </div>

      <div className="text-xl my-4">
        <p>
          WHY <span className="text-gray-700 font-semibold">CHOOSE US</span>
        </p>
      </div>

      <div className="flex flex-col md:flex-row mb-20 gap-4">
        <div className="border px-10 md:px-16 py-8 sm:py-16 flex flex-col gap-5 text-[15px] hover:bg-primary hover:text-white transition-all duration-300 text-gray-600 cursor-pointer rounded-2xl">
          <b>EFFICIENCY:</b>
          <p>Streamlined appointment scheduling that fits into your busy lifestyle.</p>
        </div>
        <div className="border px-10 md:px-16 py-8 sm:py-16 flex flex-col gap-5 text-[15px] hover:bg-primary hover:text-white transition-all duration-300 text-gray-600 cursor-pointer rounded-2xl">
          <b>CONVENIENCE:</b>
          <p>Access to a network of trusted healthcare professionals in your area.</p>
        </div>
        <div className="border px-10 md:px-16 py-8 sm:py-16 flex flex-col gap-5 text-[15px] hover:bg-primary hover:text-white transition-all duration-300 text-gray-600 cursor-pointer rounded-2xl">
          <b>PERSONALIZATION:</b>
          <p>Tailored recommendations and reminders to help you stay on top of your health.</p>
        </div>
      </div>
    </div>
  );
};

export default About;
