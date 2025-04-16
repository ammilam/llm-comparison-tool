"use client";

import { useState } from 'react';

export default function InfoBubble({ title, content }) {
  const [isVisible, setIsVisible] = useState(false);
  
  return (
    <div className="relative inline-block">
      <button 
        onClick={() => setIsVisible(!isVisible)}
        className="btn btn-circle btn-ghost btn-xs text-info"
        aria-label="Show information"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="h-4 w-4 stroke-current">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      </button>
      
      {isVisible && (
        <div className="card bg-base-200 shadow-xl absolute z-50 right-0 mt-2 w-80 md:w-96">
          <div className="card-body p-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm">{title}</h3>
              <button 
                onClick={() => setIsVisible(false)}
                className="btn btn-ghost btn-xs"
              >
                ✕
              </button>
            </div>
            <div className="divider my-1"></div>
            <div className="text-sm whitespace-pre-wrap">
              {content}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}