import { useEffect } from 'react';

const Settings = ({ 
  darkTheme, setDarkTheme,
  showModeration, setShowModeration,
  showAIResponses, setShowAIResponses,
  enableSoundNotifications, setEnableSoundNotifications,
  enableFlvStream, setEnableFlvStream,
  enableMentionNotifications, setEnableMentionNotifications,
  yourUsername, setYourUsername,
  botName, setBotName,
  aiProvider, setAiProvider,
  aiModel, setAiModel,
  openaiApiKey, setOpenaiApiKey,
  tavilyApiKey, setTavilyApiKey,
  availableOllamaModels,
}) => {
  // Function to toggle dark theme and update localStorage
  useEffect(() => {
    if (availableOllamaModels.length > 0) {
      setAiModel(availableOllamaModels[0].name);
    }
  }, [availableOllamaModels]);

  const toggleDarkTheme = (checked) => {
    setDarkTheme(checked);
    localStorage.setItem('darkTheme', checked);
    
    // Apply or remove dark class on document element
    if (checked) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };
  
  // Function to clear localStorage and reset all settings to defaults
  const clearLocalStorage = () => {
    // Clear all localStorage items
    localStorage.removeItem('darkTheme');
    localStorage.removeItem('showModeration');
    localStorage.removeItem('showAIResponses');
    localStorage.removeItem('enableSoundNotifications');
    localStorage.removeItem('enableFlvStream');
    localStorage.removeItem('enableMentionNotifications');
    localStorage.removeItem('tiktokUsername');
    localStorage.removeItem('aiProvider');
    localStorage.removeItem('aiModel');
    localStorage.removeItem('openaiApiKey');
    localStorage.removeItem('username');
    localStorage.removeItem('sessionId');
    
    // Reset all state variables to defaults
    setDarkTheme(false);
    setShowModeration(true);
    setShowAIResponses(true);
    setEnableSoundNotifications(false);
    setEnableFlvStream(true);
    setEnableMentionNotifications(true);
    setYourUsername('');
    setAiProvider('openai');
    if (availableOllamaModels.length > 0) {
      setAiModel(availableOllamaModels[0].name);
    }
    setOpenaiApiKey('');
    
    // Remove dark class from document
    document.documentElement.classList.remove('dark');
  };
  
  return (
    <div className="p-6 bg-gray-900/70 backdrop-blur-sm rounded-2xl border border-gray-800 shadow-xl transition-all duration-300">
      <div className="flex items-center mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20 mr-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-white">Settings</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        {/* Column 1 - Basic Settings */}
        <div className="space-y-5">
          <h4 className="text-sm uppercase tracking-wider text-gray-400 font-semibold mb-3 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
            </svg>
            General Options
          </h4>
          
          <div className="flex items-center justify-between px-4 py-3 bg-gray-800/60 rounded-xl border border-gray-700/70 hover:border-gray-600/80 transition-colors">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
              <span className="text-white">Dark Theme</span>
            </div>
            <label className="flex items-center cursor-pointer group">
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only"
                  checked={darkTheme} 
                  onChange={(e) => toggleDarkTheme(e.target.checked)} 
                />
                <div className={`block w-10 h-6 rounded-full transition-colors duration-200 ease-in-out ${darkTheme ? 'bg-indigo-500' : 'bg-gray-600'}`}></div>
                <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ease-in-out ${darkTheme ? 'transform translate-x-4' : ''}`}></div>
              </div>
            </label>
          </div>
          
          <div className="flex items-center justify-between px-4 py-3 bg-gray-800/60 rounded-xl border border-gray-700/70 hover:border-gray-600/80 transition-colors">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
              </svg>
              <span className="text-white">Show Moderation</span>
            </div>
            <label className="flex items-center cursor-pointer">
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only"
                  checked={showModeration} 
                  onChange={(e) => {
                    setShowModeration(e.target.checked);
                    localStorage.setItem('showModeration', e.target.checked);
                  }}
                />
                <div className={`block w-10 h-6 rounded-full transition-colors duration-200 ease-in-out ${showModeration ? 'bg-indigo-500' : 'bg-gray-600'}`}></div>
                <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ease-in-out ${showModeration ? 'transform translate-x-4' : ''}`}></div>
              </div>
            </label>
          </div>
          
          <div className="flex items-center justify-between px-4 py-3 bg-gray-800/60 rounded-xl border border-gray-700/70 hover:border-gray-600/80 transition-colors">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              <span className="text-white">Show AI Responses</span>
            </div>
            <label className="flex items-center cursor-pointer">
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only"
                  checked={showAIResponses} 
                  onChange={(e) => {
                    setShowAIResponses(e.target.checked);
                    localStorage.setItem('showAIResponses', e.target.checked);
                  }} 
                />
                <div className={`block w-10 h-6 rounded-full transition-colors duration-200 ease-in-out ${showAIResponses ? 'bg-indigo-500' : 'bg-gray-600'}`}></div>
                <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ease-in-out ${showAIResponses ? 'transform translate-x-4' : ''}`}></div>
              </div>
            </label>
          </div>
          
          <div className="flex items-center justify-between px-4 py-3 bg-gray-800/60 rounded-xl border border-gray-700/70 hover:border-gray-600/80 transition-colors">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
              </svg>
              <span className="text-white">Sound Notifications</span>
            </div>
            <label className="flex items-center cursor-pointer">
              <div className="relative">
                <input 
                  type="checkbox"
                  className="sr-only"
                  checked={enableSoundNotifications} 
                  onChange={(e) => {
                    setEnableSoundNotifications(e.target.checked);
                    localStorage.setItem('enableSoundNotifications', e.target.checked);
                  }} 
                />
                <div className={`block w-10 h-6 rounded-full transition-colors duration-200 ease-in-out ${enableSoundNotifications ? 'bg-indigo-500' : 'bg-gray-600'}`}></div>
                <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ease-in-out ${enableSoundNotifications ? 'transform translate-x-4' : ''}`}></div>
              </div>
            </label>
          </div>
          
          <div className="flex items-center justify-between px-4 py-3 bg-gray-800/60 rounded-xl border border-gray-700/70 hover:border-gray-600/80 transition-colors">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
              </svg>
              <span className="text-white">Live Video Stream</span>
            </div>
            <label className="flex items-center cursor-pointer">
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only"
                  checked={enableFlvStream} 
                  onChange={(e) => {
                    setEnableFlvStream(e.target.checked);
                    localStorage.setItem('enableFlvStream', e.target.checked);
                  }} 
                />
                <div className={`block w-10 h-6 rounded-full transition-colors duration-200 ease-in-out ${enableFlvStream ? 'bg-indigo-500' : 'bg-gray-600'}`}></div>
                <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ease-in-out ${enableFlvStream ? 'transform translate-x-4' : ''}`}></div>
              </div>
            </label>
          </div>
          
          <div className="flex items-center justify-between px-4 py-3 bg-gray-800/60 rounded-xl border border-gray-700/70 hover:border-gray-600/80 transition-colors">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
              </svg>
              <span className="text-white">Mention Notifications</span>
            </div>
            <label className="flex items-center cursor-pointer">
              <div className="relative">
                <input 
                  type="checkbox"
                  className="sr-only"
                  checked={enableMentionNotifications} 
                  onChange={(e) => {
                    setEnableMentionNotifications(e.target.checked);
                    localStorage.setItem('enableMentionNotifications', e.target.checked);
                  }} 
                />
                <div className={`block w-10 h-6 rounded-full transition-colors duration-200 ease-in-out ${enableMentionNotifications ? 'bg-indigo-500' : 'bg-gray-600'}`}></div>
                <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ease-in-out ${enableMentionNotifications ? 'transform translate-x-4' : ''}`}></div>
              </div>
            </label>
          </div>
        </div>
        
        {/* Column 2 - Advanced Settings */}
        <div className="space-y-5">
          <h4 className="text-sm uppercase tracking-wider text-gray-400 font-semibold mb-3 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M14.243 5.757a6 6 0 10-.986 9.284 1 1 0 111.087 1.678A8 8 0 1118 10a3 3 0 01-4.8 2.401A4 4 0 1114 10a1 1 0 102 0c0-1.537-.586-3.07-1.757-4.243zM12 10a2 2 0 10-4 0 2 2 0 004 0z" clipRule="evenodd" />
            </svg>
            Account & AI Settings
          </h4>
          
          <div className="bg-gray-800/60 rounded-xl border border-gray-700/70 hover:border-gray-600/80 transition-colors p-4">
            <label className="block mb-2 text-sm font-medium text-gray-300">Your TikTok Username</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500">@</span>
              </div>
              <input 
                type="text" 
                value={yourUsername} 
                onChange={(e) => {
                  let username = e.target.value.trim();
                  // Remove @ symbol if present
                  if (username.startsWith('@')) {
                    username = username.substring(1);
                  }
                  setYourUsername(username);
                  if (username) {
                    localStorage.setItem('tiktokUsername', username);
                  } else {
                    localStorage.removeItem('tiktokUsername');
                  }
                }} 
                className="w-full pl-8 pr-4 py-2.5 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all duration-200"
                placeholder="Your TikTok username for mentions"
              />
            </div>
            <p className="mt-1.5 text-xs text-gray-500">Used for detecting when someone mentions you in chat</p>
            <div className="relative">
              <input 
                type="text" 
                value={botName} 
                onChange={(e) => {
                  let botname = e.target.value.trim();                  
                  setBotName(botname);
                  if (botname) {
                    localStorage.setItem('botName', botname);
                  } else {
                    localStorage.removeItem('botName');
                  }
                }} 
                className="w-full pl-8 pr-4 py-2.5 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all duration-200"
                placeholder="The name the bot will reply to."
              />
            </div>
          </div>
          
          <div className="bg-gray-800/60 rounded-xl border border-gray-700/70 hover:border-gray-600/80 transition-colors p-4">
            <label className="block mb-3 text-sm font-medium text-gray-300">AI Provider</label>
            <div className="grid grid-cols-2 gap-3">
              <label className={`flex items-center justify-between px-4 py-3 rounded-lg cursor-pointer transition-colors ${aiProvider === 'openai' ? 'bg-indigo-500/20 border border-indigo-500/40' : 'bg-gray-900/50 border border-gray-700'}`}>
                <div className="flex items-center">
                  <input 
                    type="radio" 
                    name="aiProvider" 
                    value="openai" 
                    checked={aiProvider === 'openai'} 
                    onChange={() => {
                      setAiProvider('openai');
                      localStorage.setItem('aiProvider', 'openai');
                    }} 
                    className="sr-only"
                  />
                  <span className={`text-sm font-medium ${aiProvider === 'openai' ? 'text-indigo-300' : 'text-gray-300'}`}>OpenAI</span>
                </div>
                <div className={`w-4 h-4 rounded-full flex items-center justify-center ${aiProvider === 'openai' ? 'bg-indigo-500' : 'bg-gray-700 border border-gray-600'}`}>
                  {aiProvider === 'openai' && (
                    <div className="w-2 h-2 rounded-full bg-white"></div>
                  )}
                </div>
              </label>
              
              <label className={`flex items-center justify-between px-4 py-3 rounded-lg cursor-pointer transition-colors ${aiProvider === 'ollama' ? 'bg-indigo-500/20 border border-indigo-500/40' : 'bg-gray-900/50 border border-gray-700'}`}>
                <div className="flex items-center">
                  <input 
                    type="radio" 
                    name="aiProvider" 
                    value="ollama" 
                    checked={aiProvider === 'ollama'} 
                    onChange={() => {
                      setAiProvider('ollama');
                      localStorage.setItem('aiProvider', 'ollama');
                    }} 
                    className="sr-only"
                  />
                  <span className={`text-sm font-medium ${aiProvider === 'ollama' ? 'text-indigo-300' : 'text-gray-300'}`}>Ollama</span>
                </div>
                <div className={`w-4 h-4 rounded-full flex items-center justify-center ${aiProvider === 'ollama' ? 'bg-indigo-500' : 'bg-gray-700 border border-gray-600'}`}>
                  {aiProvider === 'ollama' && (
                    <div className="w-2 h-2 rounded-full bg-white"></div>
                  )}
                </div>
              </label>
            </div>
          </div>
          
          {aiProvider === 'ollama' && (
            <div className="bg-gray-800/60 rounded-xl border border-gray-700/70 hover:border-gray-600/80 transition-colors p-4">
              <label className="block mb-2 text-sm font-medium text-gray-300">Ollama Model</label>
              <select 
                value={aiModel} 
                onChange={(e) => {
                  setAiModel(e.target.value);
                  localStorage.setItem('aiModel', e.target.value);
                }} 
                className="w-full px-3 py-2.5 bg-gray-900/50 border border-gray-700 rounded-lg text-white shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all duration-200 appearance-none"
                style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
              >
                {availableOllamaModels.map((model) => (
                  <option key={model.name} value={model.name}>{model.name}</option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-gray-500">Select the Ollama model to use for AI responses</p>
            </div>
          )}
          
          {aiProvider === 'openai' && (
            <div className="bg-gray-800/60 rounded-xl border border-gray-700/70 hover:border-gray-600/80 transition-colors p-4">
              <label className="block mb-2 text-sm font-medium text-gray-300">OpenAI API Key</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v-1l1-1 1-1-1.414-1.414A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <input 
                  type="password" 
                  value={openaiApiKey} 
                  onChange={(e) => {
                    setOpenaiApiKey(e.target.value);
                    localStorage.setItem('openaiApiKey', e.target.value);
                  }} 
                  className="w-full pl-8 pr-4 py-2.5 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all duration-200"
                  placeholder="sk-..."
                />
              </div>
              <label className="block mb-2 text-sm font-medium text-gray-300">Tavily search API key</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v-1l1-1 1-1-1.414-1.414A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <input 
                  type="password" 
                  value={tavilyApiKey} 
                  onChange={(e) => {
                    setTavilyApiKey(e.target.value);
                    localStorage.setItem('tavilyApiKey', e.target.value);
                  }} 
                  className="w-full pl-8 pr-4 py-2.5 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all duration-200"
                  placeholder="sk-..."
                />
              </div>
              <p className="mt-1.5 text-xs text-gray-500">Your OpenAI API key is stored locally and never sent to our servers</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Reset Settings Button */}
      <div className="mt-8 pt-6 border-t border-gray-800">
        <div className="flex justify-center">
          <button
            onClick={clearLocalStorage}
            className="px-5 py-2.5 bg-red-500/20 hover:bg-red-600/30 text-red-400 hover:text-red-300 font-medium rounded-lg transition-all duration-200 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Reset All Settings
          </button>
        </div>
        <p className="text-xs text-gray-500 text-center mt-2">This will clear all saved settings and reset to defaults</p>
      </div>
    </div>
  )
}

export default Settings 