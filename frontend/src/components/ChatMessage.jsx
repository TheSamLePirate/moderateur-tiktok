import { useState } from 'react'
import { createPortal } from 'react-dom'
import UserDataDisplay from './UserDataDisplay'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import OpenAI from "openai";

// Reason Modal Component using Portal
const ReasonModal = ({ isOpen, onClose, onSubmit, nickname, reasonText, setReasonText }) => {
  if (!isOpen) return null;
  
  return createPortal(
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-xl p-5 w-full max-w-md">
        <h3 className="text-xl font-bold text-white mb-4">Add to Undesirables</h3>
        <p className="text-gray-300 mb-4">
          Please provide a reason for adding{" "}
          <span className="font-bold text-rose-400">{nickname}</span>{" "}
          to the undesirables list:
        </p>
        
        <textarea
          className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 focus:outline-none resize-none"
          rows="3"
          placeholder="Enter reason here..."
          value={reasonText}
          onChange={(e) => setReasonText(e.target.value)}
        ></textarea>
        
        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!reasonText.trim()}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const ChatMessage = ({ 
  message, 
  showModeration,
  showAIResponses,
  addToFriendsList,
  addToUndesirablesList,
  botNames 
}) => {
  const [showActions, setShowActions] = useState(false)
  const [showReasonModal, setShowReasonModal] = useState(false)
  const [reasonText, setReasonText] = useState('')

  const isBot=(message)=>{
    if (message.comment.startsWith(botNames+" ")){
      return true;
    }
    const botNamesList=botNames.split(',');
    const isBotName=botNamesList.some(name=>message.comment.startsWith(name+" "));
    return isBotName;
  }
  const openai_api_key = localStorage.getItem('openaiApiKey')
  const openai = new OpenAI({
    apiKey: openai_api_key,
    dangerouslyAllowBrowser: true
  })

  const speak = async (text) => {
    const mp3 = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "onyx",
      input: text,
      instructions: "Parle de facon enjouée",
    });
    console.log("Audio Finished");
    const arrayBuffer = await mp3.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.play();
  }
  
  // Determine username styles based on user status
  const getUsernameStyles = () => {
    if (message?.userStatus?.isFriend) {
      return {
        textColor: 'text-emerald-400'
      }
    } else if (message?.userStatus?.isUndesirable) {
      return {
        textColor: 'text-rose-400'
      }
    } else {
      return {
        textColor: 'text-blue-400'
      }
    }
  }
  
  // Get message container styles
  const getMessageContainerStyles = () => {
    let baseStyles = 'relative transition-all duration-200 group'
    
    if (message?.userStatus?.isFriend) {
      return `${baseStyles} bg-emerald-500/10 hover:bg-emerald-500/15`
    } else if (message?.userStatus?.isUndesirable) {
      return `${baseStyles} bg-rose-500/10  hover:bg-rose-500/15`
    } else {
      return `${baseStyles} bg-gray-800/60  hover:bg-gray-800/80`
    }
  }
  
  // Convert timestamp to readable format
  const formatTimestamp = (timestamp) => {
    try {
      return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }
  
  // Handle the reason submission
  const handleReasonSubmit = () => {
    addToUndesirablesList(message, reasonText)
    setShowReasonModal(false)
    setReasonText('')
  }

  // Open the reason modal
  const openReasonModal = () => {
    setShowReasonModal(true)
  }
  
  const { textColor } = getUsernameStyles()
  
  // Render different message types
  if (message.type === 'join') {
    return (
      <div 
        className={getMessageContainerStyles()}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <div className=" pl-2 flex justify-between items-center">
          <UserDataDisplay message={message} />
    
        </div>

        
        
        {/* User Actions */}
        {/* <div className={`absolute -right-1 -top-1 transition-opacity duration-200 ${showActions ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden">
            <button 
              onClick={() => addToFriendsList(message)}
              className="p-1.5 text-xs hover:bg-emerald-500/20 transition-colors focus:outline-none"
              title="Add to friends"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
              </svg>
            </button>
            <button 
              onClick={openReasonModal}
              className="p-1.5 text-xs hover:bg-rose-500/20 transition-colors focus:outline-none"
              title="Add to undesirables"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-rose-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div> */}

        {/* Reason Modal */}
        <ReasonModal 
          isOpen={showReasonModal}
          onClose={() => setShowReasonModal(false)}
          onSubmit={handleReasonSubmit}
          nickname={message.nickname}
          reasonText={reasonText}
          setReasonText={setReasonText}
        />
      </div>
    )
  } 
  
  if (message.type === 'follow') {
    return (
      <div className="flex items-center justify-center py-2 px-4 my-1.5">
        <div className="px-3 py-1.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-sm text-blue-200 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className={`font-medium ${textColor} mr-1`}>{message.nickname}</span>
          <span>followed the host</span>
        </div>
      </div>
    )
  }
  
  // Regular chat message
  return (
    <div
      className={getMessageContainerStyles()}
      onMouseEnter={() => setShowActions(false)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Header with user info and timestamp */}
      

      {/* Message content with play button to the left */}
      <div className="flex items-start pl-2">
        {/* <button 
          onClick={() => speak(message.comment)}
          className="absolute z-50 top-15 left-1 flex-shrink-0 inline-flex items-center justify-center text-emerald-500 hover:text-emerald-300 transition-colors focus:outline-none mr-2 p-1 rounded-full"
          title="Play text"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
        </button> */}
        
        
        <UserDataDisplay message={message} />
        
          {/* <p>{message.comment}</p> */}
          
          {/* Moderation indicator */}
          {showModeration && message.moderation == undefined && (
            <div className="absolute bottom-2 right-2">
              <div className="w-4 h-4 border-t-2 border-b-2 border-red-900 rounded-full animate-spin"></div>
            </div>
          )}

          {/* {showModeration && message.moderation && (
            <div className="absolute bottom-2 right-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  message.moderation.flagged
                    ? "bg-rose-500"
                    : "bg-emerald-500"
                }`}
                title={
                  message.moderation.flagged
                    ? "Flagged Content"
                    : "Safe Content"
                }
              ></div>
            </div>
          )} */}
      </div>

      {/* Moderation Results */}
      {showModeration && message.moderation && (
        <>
          {message.moderation.flagged && message.moderation.categories && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {Object.entries(message.moderation.categories).map(
                ([category, isFlagged]) =>
                  isFlagged && (
                    <span
                      key={category}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-900/70 text-rose-300 border border-rose-500/30"
                    >
                      {translateCategory(category)} {message.moderation.score}
                    </span>
                  )
              )}
            </div>
          )}
        </>
      )}

      {/* AI Response */}
      {showAIResponses && isBot(message) && (
        <div className="mt-2">
          {message.pendingResponse ? (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm animate-pulse">
              <div className="h-3 w-3 rounded-full border-2 border-blue-400 border-t-transparent animate-spin"></div>
              <span>AI is generating a response...</span>
            </div>
          ) : message.suggestedResponse ? (
            <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
              <p className="text-xs font-medium text-indigo-400 mb-1 flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3.5 w-3.5 mr-1"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                AI RESPONSE
              </p>
              <div className="flex items-start">
                <button 
                  onClick={() => speak(message.suggestedResponse)}
                  className="flex-shrink-0 inline-flex items-center justify-center text-white bg-emerald-500 hover:bg-emerald-600 transition-colors focus:outline-none mr-2 p-1 rounded-full"
                  title="Play response"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                </button>
                <div className="text-sm text-white/80 italic relative group flex-grow">
                  <Markdown 
                    remarkPlugins={[remarkGfm, remarkMath]} 
                    rehypePlugins={[rehypeKatex]}
                  >{message.suggestedResponse}</Markdown>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* User Actions */}
      <div
        className={`absolute -right-1 -top-1 transition-opacity duration-200 ${
          showActions ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="flex bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden">
          <button
            onClick={() => addToFriendsList(message)}
            className="p-1.5 text-xs hover:bg-emerald-500/20 transition-colors focus:outline-none"
            title="Add to friends"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-emerald-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          <button
            onClick={openReasonModal}
            className="p-1.5 text-xs hover:bg-rose-500/20 transition-colors focus:outline-none"
            title="Add to undesirables"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-rose-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Reason Modal */}
      <ReasonModal 
        isOpen={showReasonModal}
        onClose={() => setShowReasonModal(false)}
        onSubmit={handleReasonSubmit}
        nickname={message.nickname}
        reasonText={reasonText}
        setReasonText={setReasonText}
      />
    </div>
  );
}

// Helper function to translate moderation categories
const translateCategory = (category) => {
  const translations = {
    'harassment': 'Harassment',
    'hate': 'Hate Speech',
    'sexual': 'Sexual Content',
    'violence': 'Violence',
    'self_harm': 'Self-Harm',
    'illegal': 'Illegal Activity'
  };
  
  return translations[category] || category;
}

export default ChatMessage 