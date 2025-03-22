import React, { useState } from 'react';

/**
 * MazicList Component
 * 
 * Displays a list of mazic messages that start with a configurable prefix in chat
 * 
 * @param {Array} mazicList - Array of mazic messages with user status
 * @param {Function} clearMazicList - Function to clear the mazic list
 * @param {Function} removeFromMazicList - Function to remove a single message from the list
 * @param {String} mazicPrefix - The prefix used to identify mazic messages
 * @param {Function} setMazicPrefix - Function to update the mazic prefix
 */
const MazicList = ({ 
  mazicList, 
  clearMazicList, 
  removeFromMazicList, 
  mazicPrefix,
  setMazicPrefix 
}) => {
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [isEditingPrefix, setIsEditingPrefix] = useState(false);
  const [prefixSaved, setPrefixSaved] = useState(false);
  
  // Function to copy text to clipboard
  const copyToClipboard = (message, index) => {
    // Copy just the text content, not the object
    let textToCopy = typeof message === 'object' ? message.text : message;
    textToCopy=textToCopy.split(':')[1].trim();
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        // Show copied feedback
        setCopiedIndex(index);
        // Reset after 2 seconds
        setTimeout(() => {
          setCopiedIndex(null);
        }, 2000);
      })
      .catch((error) => {
        console.error('Error copying to clipboard:', error);
      });
  };

  // Function to search YouTube for message content
  const searchYouTube = (message) => {
    let searchQuery = typeof message === 'object' ? message.text : message;
    // Extract just the message content after the colon
    searchQuery = searchQuery.split(':')[1].trim();
    // Encode the search query for URL
    const encodedQuery = encodeURIComponent(searchQuery);
    // Open YouTube search in a new tab
    window.open(`https://www.youtube.com/results?search_query=${encodedQuery}`, '_blank');
  };

  // Handle prefix edit
  const handlePrefixEdit = () => {
    setIsEditingPrefix(true);
  };

  // Handle prefix input change
  const handlePrefixChange = (e) => {
    const newValue = e.target.value;
    
    // Allow empty values during editing, update in real-time
    setMazicPrefix(newValue);
  };

  // Save prefix changes
  const savePrefixChanges = () => {
    if (mazicPrefix.trim() !== '') {
      // Ensure we trim any whitespace when saving
      setMazicPrefix(mazicPrefix.trim());
      setPrefixSaved(true);
      // Reset the saved flag after 3 seconds
      setTimeout(() => {
        setPrefixSaved(false);
      }, 3000);
      setIsEditingPrefix(false);
    } else {
      // If empty, alert the user
      alert("Prefix cannot be empty");
    }
  };

  // Handle prefix input keydown
  const handlePrefixKeyDown = (e) => {
    if (e.key === 'Enter') {
      savePrefixChanges();
    }
  };

  // Helper function to get message container styles based on user status
  const getMessageStyles = (userStatus) => {
    if (!userStatus) return "text-sm text-white";
    
    if (userStatus.isFriend) {
      return "text-sm text-emerald-400 font-medium";
    } else if (userStatus.isUndesirable) {
      return "text-sm text-rose-400 font-medium";
    } else {
      return "text-sm text-white";
    }
  };

  // Get message content from different possible formats
  const getMessageText = (message) => {
    if (typeof message === 'object' && message.text) {
      return message.text;
    }
    return message;
  };

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/70 backdrop-blur-sm shadow-xl overflow-hidden">
      <div className="px-4 py-3 bg-gradient-to-r from-gray-800 to-gray-900 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
          <h3 className="text-lg font-bold text-white">Mazic List</h3>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            {mazicList.length} items
          </span>
          
          {mazicList.length > 0 && (
            <button 
              onClick={clearMazicList}
              className="p-1 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-colors"
              aria-label="Clear all items"
              title="Clear all items"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>
      
      <div className="p-4 border-b border-gray-700 bg-gray-800/50">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Current Prefix:</span>
            {prefixSaved && (
              <span className="text-xs text-green-400 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Saved!
              </span>
            )}
          </div>
          
          {isEditingPrefix ? (
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                value={mazicPrefix}
                onChange={handlePrefixChange}
                onKeyDown={handlePrefixKeyDown}
                placeholder="Enter prefix..."
                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
              <button 
                onClick={savePrefixChanges}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-sm transition-colors"
              >
                Save
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center bg-gray-700/70 border border-gray-600 rounded-lg px-3 py-2">
                <code className="text-indigo-300 text-sm font-mono">{mazicPrefix}</code>
              </div>
              <button 
                onClick={handlePrefixEdit}
                className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm transition-colors"
              >
                Edit
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900"
        style={{ 
          scrollbarWidth: 'thin',
          scrollbarColor: '#4B5563 #111827'
        }}
      >
        {mazicList.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p>No mazic items yet</p>
            <p className="text-xs mt-1">Messages starting with "{mazicPrefix}" will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {mazicList.map((message, index) => {
              // Get styles based on user status (if available)
              const userStatus = message?.userStatus || null;
              console.log("User status MazicList:"+JSON.stringify(userStatus));
              const messageStyles = getMessageStyles(userStatus);
              const messageText = getMessageText(message);
              
              // Determine container styles based on user status
              let containerStyles = "p-3 hover:bg-gray-800/50 transition-colors group";
              if (userStatus?.isFriend) {
                containerStyles += " bg-emerald-500/10 border-emerald-500/20";
              } else if (userStatus?.isUndesirable) {
                containerStyles += " bg-rose-500/10 border-rose-500/20";
              }
              
              return (
                <div key={index} className={containerStyles}>
                  <div className="flex justify-between items-start gap-2">
                    <p className={messageStyles}>{messageText}</p>
                    <div className="flex items-center gap-1 opacity-1 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => searchYouTube(message)}
                        className="p-1 rounded bg-gray-700 hover:bg-red-600 text-gray-300 hover:text-white transition-colors"
                        aria-label="Search on YouTube"
                        title="Search on YouTube"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                        </svg>
                      </button>
                      <button 
                        onClick={() => copyToClipboard(message, index)}
                        className="p-1 rounded bg-gray-700 hover:bg-indigo-600 text-gray-300 hover:text-white transition-colors"
                        aria-label="Copy to clipboard"
                        title="Copy to clipboard"
                      >
                        {copiedIndex === index ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                        )}
                      </button>
                      <button 
                        onClick={() => removeFromMazicList(index)}
                        className="p-1 rounded bg-gray-700 hover:bg-rose-600 text-gray-300 hover:text-white transition-colors"
                        aria-label="Remove item"
                        title="Remove item"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MazicList; 