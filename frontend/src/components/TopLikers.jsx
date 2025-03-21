import React, { useState, useEffect } from 'react';
import UserDataDisplay from './UserDataDisplay'

const TopLikers = ({ likers }) => {
  // Sort likers by likeCount in descending order
  const sortedLikers = [...likers].sort((a, b) => b.likeCount - a.likeCount);
  
  // Track previous likers state to detect changes
  const [prevLikers, setPrevLikers] = useState({});
  const [flashingLikers, setFlashingLikers] = useState({});
  
  // useEffect(() => {
  //   // Create a map of current like counts by uniqueId
  //   const currentLikerCounts = {};
  //   sortedLikers.forEach(liker => {
  //     currentLikerCounts[liker.uniqueId] = liker.likeCount;
  //   });
    
  //   // Detect changes (but skip first render)
  //   if (Object.keys(prevLikers).length > 0) {
  //     const newFlashingLikers = {};
      
  //     // Check for likers whose count has changed
  //     sortedLikers.forEach(liker => {
  //       const currentCount = liker.likeCount;
  //       const prevCount = prevLikers[liker.uniqueId];
        
  //       // If we have a previous count and it's different, trigger flash
  //       if (prevCount !== undefined && prevCount !== currentCount) {
  //         newFlashingLikers[liker.uniqueId] = true;
  //       }
  //     });
      
  //     // If we found changes, update the flashing state
  //     if (Object.keys(newFlashingLikers).length > 0) {
  //       // Set flashing state
  //       setFlashingLikers(newFlashingLikers);
        
  //       // Clear flashing after animation completes
  //       const timer = setTimeout(() => {
  //         setFlashingLikers({});
  //       }, 1000);
        
  //       return () => clearTimeout(timer);
  //     }
  //   }
    
  //   // Always update the previous likers state after comparison
  //   // This needs to happen outside the if block to capture the first render too
  //   setPrevLikers(currentLikerCounts);
  // }, [sortedLikers, prevLikers]); // Include both dependencies
  
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/70 backdrop-blur-sm shadow-xl overflow-hidden">
      <div className="px-4 py-3 bg-gradient-to-r from-gray-800 to-gray-900 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
          </svg>
          <h3 className="text-lg font-bold text-white">Top Fans</h3>
        </div>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/30">
          {likers.length} fans
        </span>
      </div>
      
      <style jsx>{`
        @keyframes flash {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.15); background-color: rgba(239, 68, 68, 0.5); }
        }
        .flashing {
          animation: flash 0.8s ease-in-out;
        }
      `}</style>
      
      <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900" 
        style={{ 
          scrollbarWidth: 'thin',
          scrollbarColor: '#4B5563 #111827'
        }}
      >
        {sortedLikers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <p>No likes yet</p>
            <p className="text-xs mt-1">Users who like the stream will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {sortedLikers.map((liker, index) => (
              <div 
                key={liker.uniqueId} 
                className={`flex items-center justify-between px-4 py-3 transition-colors ${
                  liker.userStatus?.isFriend ? 'bg-emerald-500/10 hover:bg-emerald-500/15' : 
                  liker.userStatus?.isUndesirable ? 'bg-rose-500/10 hover:bg-rose-500/15' : 
                  'hover:bg-gray-800/70'
                }`}
              >
                <div className="flex items-center">
                  <div className={`flex items-center justify-center w-7 h-7 rounded-full mr-3 text-xs font-bold ${
                    index < 3 ? 
                      index%2 === 0 ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' : 
                      index%2 === 1 ? 'bg-gray-300/20 text-gray-300 border border-gray-300/30' : 
                      'bg-amber-600/20 text-amber-400 border border-amber-600/30' : 
                      'bg-gray-700 text-gray-400 border border-gray-600/30'
                  }`}>
                    {index + 1}
                  </div>
                  
                  <div>
                    <span className={`font-medium ${
                      liker.userStatus?.isFriend ? 'text-emerald-400' : 
                      liker.userStatus?.isUndesirable ? 'text-rose-400' : 
                      'text-white'
                    }`}>
                      <UserDataDisplay message={liker} />
                      {/* {liker.nickname} */}
                    </span>
                    
                    
                  </div>
                </div>
                
                <div className={`flex items-center bg-red-500/20 px-2 py-1 rounded-full border border-red-500/30 ${flashingLikers[liker.uniqueId] ? 'flashing' : ''}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs font-medium text-red-300">{liker.likeCount.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TopLikers; 