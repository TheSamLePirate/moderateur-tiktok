import { useEffect, useRef,useState } from 'react'
import ChatMessage from './ChatMessage'
import StatsBar from './StatsBar'

const ChatContainer = ({ 
  chatMessages, 
  showModeration, 
  showAIResponses, 
  addToFriendsList, 
  addToUndesirablesList,
  autoScroll,
  setAutoScroll,
  botNames,
  viewerCount,
  likeCount,
  diamondsCount
}) => {
  const chatContainerRef = useRef(null)
  const [search, setSearch] = useState('')
  const [showJoinMessages, setShowJoinMessages] = useState(true)
  
  // Custom smooth scroll function with longer duration
  const smoothScrollToBottom = (duration = 600) => {
    const element = chatContainerRef.current
    if (!element) return
    
    const targetPosition = element.scrollHeight
    const startPosition = element.scrollTop
    const distance = targetPosition - startPosition
    let startTime = null
    
    const animation = currentTime => {
      if (!startTime) startTime = currentTime
      const timeElapsed = currentTime - startTime
      const progress = Math.min(timeElapsed / duration, 1)
      
      // Using the same cubic-bezier as the message animation for consistency
      const easeCubicBezier = t => {
        // This approximates cubic-bezier(0.175, 0.885, 0.32, 1.275)
        return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1
      }
      
      const ease = easeCubicBezier(progress)
      
      element.scrollTop = startPosition + distance * ease
      
      if (timeElapsed < duration) {
        requestAnimationFrame(animation)
      }
    }
    
    requestAnimationFrame(animation)
  }
  
  // Auto-scroll chat when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current && autoScroll) {
      smoothScrollToBottom()
    }
  }, [chatMessages, autoScroll])
  
  // Initialize showJoinMessages from localStorage if available
  useEffect(() => {
    const savedShowJoinMessages = localStorage.getItem('showJoinMessages')
    if (savedShowJoinMessages !== null) {
      setShowJoinMessages(savedShowJoinMessages === 'true')
    }
  }, [])
  
  // Filter messages by nickname if search is not empty and by type if showJoinMessages is false
  const filteredMessages = chatMessages
    .filter(msg => {
      // First apply search filter if needed
      const passesSearchFilter = search.trim() === '' || 
        (msg.nickname && msg.nickname.toLowerCase().includes(search.toLowerCase())) ||
        (msg.comment && msg.comment.toLowerCase().includes(search.toLowerCase()));
      
      // Then filter out join messages if the toggle is off
      const passesJoinFilter = showJoinMessages || msg.type !== 'join';
      
      return passesSearchFilter && passesJoinFilter;
    });

  // Export filtered messages to CSV
  const exportToCSV = () => {
    // Handle empty messages case
    if (filteredMessages.length === 0) {
      alert('No messages to export');
      return;
    }

    // Create CSV content
    let csvContent = 'Type,Nickname,UniqueId,Timestamp,Message,UserStatus\n';
    
    filteredMessages.forEach(msg => {
      // Format timestamp
      let timestamp = '';
      try {
        timestamp = new Date(msg.timestamp).toLocaleString();
      } catch {
        timestamp = '';
      }
      
      // Determine user status text
      let userStatus = '';
      if (msg.userStatus) {
        if (msg.userStatus.isFriend) {
          userStatus = 'Friend';
        } else if (msg.userStatus.isUndesirable) {
          userStatus = 'Undesirable';
        }
      }
      
      // Format CSV row and handle potential commas in content
      const formattedRow = [
        msg.type || 'chat',
        msg.nickname ? `"${msg.nickname.replace(/"/g, '""')}"` : '',
        msg.uniqueId ? `"${msg.uniqueId}"` : '',
        `"${timestamp}"`,
        msg.comment ? `"${msg.comment.replace(/"/g, '""')}"` : '',
        `"${userStatus}"`
      ].join(',');
      
      csvContent += formattedRow + '\n';
    });
    
    // Create a blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Create filename with current date/time
    const now = new Date();
    const filename = `chat_export_${now.toISOString().split('T')[0]}_${now.toTimeString().split(' ')[0].replace(/:/g, '-')}.csv`;
    
    // Setup and trigger download
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <div className="flex flex-col h-[600px] lg:h-[700px] rounded-2xl overflow-hidden border border-gray-800 bg-gray-900/70 backdrop-blur-sm shadow-xl">
      <style>
        {`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(-100px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .message-animation {
            opacity: 0;
            animation: fadeInUp 0.6s ease-out forwards;
          }
        `}
      </style>
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-gray-800 to-gray-900 border-b border-gray-700">
      
        <div>
        

          <input type="text" placeholder="Search" className="rounded-full bg-gray-800 text-white px-4 py-2 border border-gray-700" value={search} onChange={(e) => setSearch(e.target.value)} />
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
          {viewerCount} viewers
          </span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
          {likeCount} likes
          </span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
          {diamondsCount} Diamonds
          </span>
        </div>
        <div className="flex items-center space-x-2">
          
          
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
            {search.trim() !== '' ? `${filteredMessages.length}/${chatMessages.filter(msg => msg.type !== 'join').length}` : chatMessages.filter(msg => msg.type !== 'join').length} messages
          </span>
        </div>
      </div>
      
      <div 
        className="flex-1 overflow-y-auto  scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900" 
        ref={chatContainerRef}
        style={{ 
          scrollbarWidth: 'thin',
          scrollbarColor: '#4B5563 #111827'
        }}
      >
        {chatMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p>No messages yet</p>
            <p className="text-xs mt-1">Messages will appear here when users chat</p>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 19H5V5h7V3H5a2 2 0 00-2 2v14a2 2 0 002 2h14c1.1 0 2-.9 2-2v-7h-2v7z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />
            </svg>
            <p>No matching messages</p>
            <p className="text-xs mt-1">No nicknames match "{search}"</p>
          </div>
        ) : (
          <div className="space-y-0">
            {filteredMessages.map((msg, index) => (
              <div 
                key={`msg-${index}-${index}`}
                className="message-animation"
              >
                <ChatMessage 
                  message={msg}
                  showModeration={showModeration}
                  showAIResponses={showAIResponses}
                  addToFriendsList={addToFriendsList}
                  addToUndesirablesList={addToUndesirablesList}
                  botNames={botNames}
                />
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="border-t border-gray-700 p-3 bg-gray-800/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 cursor-pointer group">
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only"
                  checked={autoScroll} 
                  onChange={(e) => {
                    setAutoScroll(e.target.checked);
                    localStorage.setItem('autoScroll', e.target.checked);
                    
                    // If auto-scroll was just re-enabled, scroll to bottom
                    if (e.target.checked && chatContainerRef.current) {
                      smoothScrollToBottom();
                    }
                  }} 
                />
                <div className={`block w-10 h-6 rounded-full transition-colors duration-200 ease-in-out ${autoScroll ? 'bg-pink-500' : 'bg-gray-600'}`}></div>
                <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ease-in-out ${autoScroll ? 'transform translate-x-4' : ''}`}></div>
              </div>
              <span className={`text-sm ${autoScroll ? 'text-pink-400' : 'text-gray-400'} group-hover:text-white transition-colors`}>Auto-scroll</span>
            </label>
            
            <label className="flex items-center space-x-2 cursor-pointer group">
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only"
                  checked={showJoinMessages} 
                  onChange={(e) => {
                    setShowJoinMessages(e.target.checked);
                    localStorage.setItem('showJoinMessages', e.target.checked);
                  }} 
                />
                <div className={`block w-10 h-6 rounded-full transition-colors duration-200 ease-in-out ${showJoinMessages ? 'bg-pink-500' : 'bg-gray-600'}`}></div>
                <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ease-in-out ${showJoinMessages ? 'transform translate-x-4' : ''}`}></div>
              </div>
              <span className={`text-sm ${showJoinMessages ? 'text-pink-400' : 'text-gray-400'} group-hover:text-white transition-colors`}>Show joins</span>
            </label>
          </div>
          {/* <div className="flex items-center space-x-2">
          <button
            onClick={exportToCSV}
            className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-colors"
            title="Export messages to CSV"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>
          </div> */}
          
          {!autoScroll && (
            <button 
              className="flex items-center bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1 focus:ring-offset-gray-800"
              onClick={() => {
                if (chatContainerRef.current) {
                  smoothScrollToBottom();
                }
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              Jump to latest
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ChatContainer 