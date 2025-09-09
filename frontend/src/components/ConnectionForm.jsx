import { useState, useEffect } from 'react';

const ConnectionForm = ({ 
  username, 
  setUsername, 
  connect, 
  isConnecting, 
  error,
  sessionId,
  setSessionId
}) => {

  const [showSessionId, setShowSessionId] = useState(false);

  useEffect(() => {
    //set username from local storage
    setUsername(localStorage.getItem('username') || "");
    setSessionId(localStorage.getItem('sessionId') || "");
  }, []);

  useEffect(() => {
    localStorage.setItem('username', username);
    localStorage.setItem('sessionId', sessionId);
  }, [username, sessionId]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      // Check for Ctrl+K
      if (event.ctrlKey && event.key === 'k') {
        event.preventDefault(); // Prevent default browser behavior
        setShowSessionId(prevState => !prevState);
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup event listener on component unmount
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className=" mx-auto flex flex-col gap-2 p-6 bg-gray-800/30 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-700/30">
      <div className="flex items-center mb-2">
        <div className="w-10 h-10 flex-shrink-0 bg-gradient-to-br from-pink-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg shadow-pink-500/20">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 2H3v16h5v4l4-4h5l4-4V2zm-10 9V7m5 4V7" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-lg font-bold text-white">Connection à TikTok Live</h3>
          <p className="text-sm text-gray-400">Entrez le nom d'utilisateur de l'host du Live Spectrum</p>
        </div>
      </div>
      
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <span className="text-gray-400">@</span>
        </div>
        <input
          type="text"
          placeholder="TikTok Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full pl-8 pr-4 py-3.5 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 shadow-inner focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-transparent transition-all duration-200"
        />
      </div>
      {showSessionId && (
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <span className="text-gray-400">#</span>
        </div>
        <input
          type="password" 
          placeholder="session_id (optional)"
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          className="w-full pl-8 pr-4 py-3.5 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 shadow-inner focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-transparent transition-all duration-200"
        />
      </div>
      )}
      <button 
        onClick={connect} 
        disabled={isConnecting || !username}
        className="w-full py-3.5 px-4 bg-gradient-to-r from-pink-500 to-red-500 text-white font-bold rounded-xl hover:from-pink-600 hover:to-red-600 focus:outline-none focus:ring-2 focus:ring-pink-500/50 shadow-lg shadow-pink-500/20 hover:shadow-pink-500/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-pink-500 disabled:hover:to-red-500 disabled:hover:shadow-pink-500/20 group"
      >
        <span className="flex items-center justify-center">
          {isConnecting ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Connection...</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 group-hover:animate-pulse" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
              <span>Connecter au stream</span>
            </>
          )}
        </span>
      </button>
      
      {error && (
        <div className="mt-1 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-200 font-medium text-center">
          <div className="flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        </div>
      )}
    </div>
  )
}

export default ConnectionForm 