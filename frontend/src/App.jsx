import { useState, useEffect, useRef } from 'react'
import './App.css'
import TikTokConnection from './utils/TikTokConnection'
import * as UserApi from './utils/UserApi'

// Import Bootstrap icons (if they're not already in index.html)
// If you're using a bundler, you can use this import instead
// import 'bootstrap-icons/font/bootstrap-icons.css'

// Import components
import ConnectionForm from './components/ConnectionForm'
import Settings from './components/Settings'
import StatsBar from './components/StatsBar'
import VideoPlayer from './components/VideoPlayer'
import ChatContainer from './components/ChatContainer'
import GiftsContainer from './components/GiftsContainer'
import UserLists from './components/UserLists'
import ModerationStats from './components/ModerationStats'
import Notifications from './components/Notifications'
import MazicList from './components/MazicList'
import TopLikers from './components/TopLikers'

function App() {
  // Connection state
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [username, setUsername] = useState('')
  const [botName, setBotName] = useState('')
  const [error, setError] = useState('')
  const [sessionId, setSessionId] = useState('')

  const [availableOllamaModels, setAvailableOllamaModels] = useState([])
  
  // Counters
  const [viewerCount, setViewerCount] = useState(0)
  const [likeCount, setLikeCount] = useState(0)
  const [diamondsCount, setDiamondsCount] = useState(0)
  
  // Chat & gifts state & likes
  const [chatMessages, setChatMessages] = useState([])
  const [gifts, setGifts] = useState([])
  const [likes, setLikes] = useState([])
  
  // AI response state
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false)
  const [openaiApiKey, setOpenaiApiKey] = useState('')
  const [tavilyApiKey, setTavilyApiKey] = useState('')
  // Settings
  const [showModeration, setShowModeration] = useState(false)
  const [showAIResponses, setShowAIResponses] = useState(false)
  const [enableSoundNotifications, setEnableSoundNotifications] = useState(false)
  const [enableMentionNotifications, setEnableMentionNotifications] = useState(true)
  const [yourUsername, setYourUsername] = useState('')
  const [aiProvider, setAiProvider] = useState('openai')
  const [aiModel, setAiModel] = useState('')
  const [darkTheme, setDarkTheme] = useState(true)
  const [enableFlvStream, setEnableFlvStream] = useState(true)
  const [autoScroll, setAutoScroll] = useState(true)

  //mazic state
  const [mazicList, setMazicList] = useState([]);
  const [mazicPrefix, setMazicPrefix] = useState('mazic:');
  const [allChatMessages, setAllChatMessages] = useState([]); // Store all chat messages to reprocess when prefix changes
  
  // User lists
  const [friendsList, setFriendsList] = useState([])
  const [undesirablesList, setUndesirablesList] = useState([])
  const [showUserLists, setShowUserLists] = useState(false)
  
  // Moderation stats
  const [moderationStats, setModerationStats] = useState({
    total: 0,
    flagged: 0,
    safe: 0,
    categories: {
      harassment: 0,
      hate: 0,
      sexual: 0,
      violence: 0,
      self_harm: 0,
      illegal: 0
    }
  })
  
  // Notifications state
  const [notifications, setNotifications] = useState([])
  
  // Refs
  const connectionRef = useRef(null)
  const flaggedCommentSoundRef = useRef(null)
  
  // Function to apply dark theme
  const applyTheme = (isDark) => {
    if (isDark) {
      document.documentElement.setAttribute('data-bs-theme', 'dark');
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
    } else {
      document.documentElement.setAttribute('data-bs-theme', 'light');
      document.body.classList.remove('dark-theme');
      document.body.classList.add('light-theme');
    }
  };
  
  // Update the setDarkTheme function to integrate with API and apply theme
  const handleThemeChange = async (isDark) => {
    setDarkTheme(isDark);
    applyTheme(isDark);
    
    // Save to localStorage as fallback
    localStorage.setItem('darkTheme', isDark);
    
    
  };
  
  // Initialize connection
  useEffect(() => {
    // With the proxy configuration, we can connect to the same origin
    // If running from file://, use the demo backend
    
    connectionRef.current = new TikTokConnection(undefined);

    console.log("Connection ref: "+connectionRef.current.RoomMessage);
    
    // Set up the Ollama models listener immediately when connection is initialized
    connectionRef.current.on('ollamaModels', (models) => {
      console.log("Available Ollama models received:");
      console.log(models);
      setAvailableOllamaModels(models);
    });
    
    // Load all settings
    const loadSettingsFromApi = async () => {
      console.log("Loading settings from API");
      try {
        // Try to get preferences from API first
        
        
        const loadSetting = (key, stateSetter, defaultValue = null) => {
          const savedValue = localStorage.getItem(key);
          if (savedValue !== null) {
            try {
              if (typeof defaultValue === 'boolean') {
                // Handle boolean values
                stateSetter(savedValue === 'true');
              } else {
                // Handle other values
                stateSetter(savedValue);
              }
            } catch (e) {
              console.error(`Error loading setting ${key}:`, e);
            }
          }
        };
        
        // Load theme from localStorage
        const savedTheme = localStorage.getItem('darkTheme');
        const isDark = savedTheme === null ? true : savedTheme === 'true';
        setDarkTheme(isDark);
        applyTheme(isDark);
        
        // Load other settings
        loadSetting('showModeration', setShowModeration, false);
        loadSetting('showAIResponses', setShowAIResponses, false);
        loadSetting('enableSoundNotifications', setEnableSoundNotifications, false);
        loadSetting('enableMentionNotifications', setEnableMentionNotifications, true);
        loadSetting('enableFlvStream', setEnableFlvStream, true);
        loadSetting('tiktokUsername', setYourUsername, '');
        loadSetting('botName', setBotName, '');
        loadSetting('openaiApiKey', setOpenaiApiKey, '');
        loadSetting('tavilyApiKey', setTavilyApiKey, '');
        loadSetting('aiProvider', setAiProvider, 'openai');
        loadSetting('aiModel', setAiModel, '');
        loadSetting('autoScroll', setAutoScroll, true);
        loadSetting('mazicPrefix', setMazicPrefix, 'mazic:');
        
        // Apply other settings from API if available
        // ...

      } catch (error) {
        console.error('Error loading preferences from API:', error);
        
        // Fallback to localStorage for all settings
        const loadSetting = (key, stateSetter, defaultValue = null) => {
          const savedValue = localStorage.getItem(key);
          console.log("Loading setting "+key+" from localStorage: "+savedValue);
          if (savedValue !== null) {
            try {
              if (typeof defaultValue === 'boolean') {
                // Handle boolean values
                stateSetter(savedValue === 'true');
              } else {
                // Handle other values
                console.log("Setting "+key+" to "+savedValue);
                stateSetter(savedValue);
              }
            } catch (e) {
              console.error(`Error loading setting ${key}:`, e);
            }
          }
        };
        
        // Load theme from localStorage
        const savedTheme = localStorage.getItem('darkTheme');
        const isDark = savedTheme === null ? true : savedTheme === 'true';
        setDarkTheme(isDark);
        applyTheme(isDark);
        
        // Load other settings
        loadSetting('showModeration', setShowModeration, false);
        loadSetting('showAIResponses', setShowAIResponses, false);
        loadSetting('enableSoundNotifications', setEnableSoundNotifications, false);
        loadSetting('enableMentionNotifications', setEnableMentionNotifications, true);
        loadSetting('enableFlvStream', setEnableFlvStream, true);
        loadSetting('tiktokUsername', setYourUsername, '');
        loadSetting('botName', setBotName, '');
        loadSetting('openaiApiKey', setOpenaiApiKey, '');
        loadSetting('tavilyApiKey', setTavilyApiKey, '');
        loadSetting('aiProvider', setAiProvider, 'openai');
        loadSetting('aiModel', setAiModel, '');
        loadSetting('autoScroll', setAutoScroll, true);
        loadSetting('mazicPrefix', setMazicPrefix, 'mazic:');
      }
    };
    
    loadSettingsFromApi();
    
    // Load user lists from localStorage as fallback
    const loadedFriends = localStorage.getItem('friendsList');
    const loadedUndesirables = localStorage.getItem('undesirablesList');
    
    if (loadedFriends) {
      try {
        setFriendsList(JSON.parse(loadedFriends));
      } catch (e) {
        console.error('Error loading friends list', e);
      }
    }
    
    if (loadedUndesirables) {
      try {
        setUndesirablesList(JSON.parse(loadedUndesirables));
      } catch (e) {
        console.error('Error loading undesirables list', e);
      }
    }
    
    // Initialize sound
    flaggedCommentSoundRef.current = new Audio('https://www.soundjay.com/misc/small-bell-ring-01a.mp3');
    
    // Load user lists from API
    loadUserLists();
    
    // Request notification permission
    requestNotificationPermission();
    
    return () => {
      // Cleanup
      // Any cleanup code goes here
    };
  }, []);
  
  // Connect to TikTok LIVE
  const connect = async () => {
    if (!username) {
      setError('Please enter a username')
      return
    }
    
    setIsConnecting(true)
    setError('')
    
    try {
      await connectionRef.current.connect(username, {
        enableExtendedGiftInfo: true,
        aiProvider,
        aiModel,
        showModeration,
        showResponses: showAIResponses,
        openaiApiKey: aiProvider === 'openai' ? openaiApiKey : undefined,
        tavilyApiKey: aiProvider === 'openai' ? tavilyApiKey : undefined,
        sessionId: sessionId,
        botName: botName
      })
      
      setIsConnected(true)
      setupEventListeners()
    } catch (err) {
      setError(`Connection failed: ${err}`)
    } finally {
      setIsConnecting(false)
    }
  }
  
  const disconnect = () => {
    // Properly disconnect from the socket
    if (connectionRef.current) {
      // Disconnect the socket before resetting state
      if (connectionRef.current.socket) {
        //console.log('Disconnecting socket...');
        connectionRef.current.socket.disconnect();
      }
      
      // Just reset our state
      connectionRef.current.isConnected = false;
      connectionRef.current.uniqueId = null;
      connectionRef.current.streamUrl = null;
    }
    
    // Reset all state
    setIsConnected(false)
    setChatMessages([])
    setGifts([])
    setLikes([])
    setViewerCount(0)
    setLikeCount(0)
    setDiamondsCount(0)
    //reload the page
    window.location.reload();
  }
  
  const setupEventListeners = () => {
    const conn = connectionRef.current
    
    // Viewer stats
    conn.on('roomUser', (data) => {
      console.log(data);

      setViewerCount(data.viewerCount)
    })
    
    conn.on('like', (data) => {
      const userStatus = checkUserStatus(data);
      setLikeCount(prevCount => prevCount + data.likeCount)
      console.log("Got the like :" + data.likeCount + " from " + data.nickname);

      // Update likes array using setLikes to maintain state properly
      setLikes(prevLikes => {
        // Check if user already exists in the likes array
        const existingLikerIndex = prevLikes.findIndex(liker => liker.uniqueId === data.uniqueId);
        
        if (existingLikerIndex !== -1) {
          // User exists, update their like count
          const updatedLikes = [...prevLikes];
          updatedLikes[existingLikerIndex] = {
            ...updatedLikes[existingLikerIndex],
            likeCount: updatedLikes[existingLikerIndex].likeCount + data.likeCount,
            userStatus // Always update the user status with latest
          };
          return updatedLikes;
        } else {
          // User doesn't exist, add them to the likes array

          //message.followInfo example
  //followInfo: {followingCount: 1401, followerCount: 409, followStatus: 0, pushStatus: 0}

  //user description example
  //message.userDetails.bioDescription="..."

  //message.followRole
  //message.gifterLevel
  //message.isModerator
  //message.isSubscriber
  //message.teamMemberLevel
  //message.userStatus: {isFriend: false, isUndesirable: false}
          return [...prevLikes, {
            ...data,
            userStatus

          }];
        }
      });
    })
    
    conn.on('gift', (data) => {
      if (data.diamondCount > 0) {
        setDiamondsCount(prevCount => prevCount + data.diamondCount)
      }
      
      // Add gift to the list
      setGifts(prevGifts => {
        const newGifts = [...prevGifts, data]
        // Keep only the most recent 200 gifts
        if (newGifts.length > 200) {
          return newGifts.slice(newGifts.length - 200)
        }
        return newGifts
      })
    })
    
    // Chat messages - now using socket approach
    conn.on('chat', (data) => {
      // Always get the latest user status from the current lists
      const userStatus = checkUserStatus(data);
      
      // We now receive initial message from the server with pending moderation/response flags
      // Add message to chat using sanitized text to prevent XSS
      const sanitizedComment = sanitize(data.comment)
      console.log("Got the comment :" + sanitizedComment);

      // Add to all chat messages for mazic filtering
      setAllChatMessages(prev => {
        const newMessages = [...prev, {
          ...data,
          sanitizedComment,
          comment: data.comment, // Ensure we keep the original comment
          nickname: data.nickname, // Ensure we keep the nickname
          userStatus // Include the user status
        }];
        // Keep the most recent 10000 messages
        if (newMessages.length > 10000) {
          return newMessages.slice(newMessages.length - 10000);
        }
        return newMessages;
      });

      // Process this message with current mazic prefix
      processMessageWithCurrentPrefix(data);

      // Check for mentions
      if (enableMentionNotifications && yourUsername && data.comment.toLowerCase().includes(yourUsername.toLowerCase())) {
        // Show mention notification
        showMentionNotification(data)
      }
      
      setChatMessages(prevMessages => {
        const newMessages = [...prevMessages, {...data, comment: sanitizedComment, userStatus}]
        // Keep only the most recent 1000 messages
        if (newMessages.length > 1000) {
          return newMessages.slice(newMessages.length - 1000)
        }
        return newMessages
      })
      
      // If moderation is enabled, we will get updates via chatUpdate
      if (showModeration) {
        setIsGeneratingResponse(true)
      }
    })
    
    // Handle chat updates from server (moderation results and AI responses)
    conn.on('chatUpdate', (update) => {
      // Update the message in the chat list
      setChatMessages(prevMessages => {
        return prevMessages.map(msg => {
          if (msg.msgId === update.id) {
            if (update.type === 'moderation') {
              // If we have moderation results
              if (update.data.moderation?.flagged && enableSoundNotifications) {
                playFlaggedCommentSound()
                
                // Show notification for flagged content
                if (enableMentionNotifications) {
                  showModerationNotification(update.data, update.data.comment, update.data.moderation)
                }
              }
              
              // Update moderation stats
              if (update.data.moderation) {
                updateModerationStats(update.data.moderation)
              }
              
              return {
                ...msg,
                pendingModeration: false,
                moderation: update.data.moderation
              }
            } else if (update.type === 'response') {
              // Handle AI response update
              setIsGeneratingResponse(false)
              return {
                ...msg,
                pendingResponse: false,
                suggestedResponse: update.data.suggestedResponse
              }
            }
          }
          return msg
        })
      })
    })
    
    // Handle stream end
    conn.on('streamEnd', () => {
      console.warn('LIVE has ended')
      
      // Add to notifications
      const notification = {
        id: Date.now(),
        type: 'info',
        title: 'Stream Ended',
        message: 'The LIVE stream has ended',
        timestamp: new Date()
      }
      
      setNotifications(prev => [...prev, notification])
      
      // Remove after 5 seconds
      setTimeout(() => {
        removeNotification(notification.id)
      }, 50000)
      
      // Disconnect
      //disconnect()
    })
    
    // Member join
    conn.on('member', (data) => {
      const userStatus = checkUserStatus(data)
      console.log("Got the member :" + data.nickname);
      console.log("User status :" + JSON.stringify(userStatus));
      
      // Show notification if the user is a friend or undesirable
      if (userStatus.isFriend || userStatus.isUndesirable) {
        showUserJoinNotification(data, userStatus);
        playFlaggedCommentSound();
      }
      
      setChatMessages(prevMessages => {
        const newMessages = [...prevMessages, {...data, type: 'join', userStatus}]
        if (newMessages.length > 1000) {
          return newMessages.slice(newMessages.length - 1000)
        }
        return newMessages
      })
    })
    
    // Follow
    conn.on('follow', (data) => {
      const userStatus = checkUserStatus(data)
      
      setChatMessages(prevMessages => {
        const newMessages = [...prevMessages, {...data, type: 'follow', userStatus}]
        if (newMessages.length > 1000) {
          return newMessages.slice(newMessages.length - 1000)
        }
        return newMessages
      })
    })
  }
  
  const checkUserStatus = (data) => {
    // Check if user is in friends or undesirables list
    // userId from chat messages will match with uniqueId in our lists
    const tiktokUsername = data.uniqueId;

    const friendListNow = JSON.parse(localStorage.getItem('friendsList'));
    const undesirablesListNow = JSON.parse(localStorage.getItem('undesirablesList'));
        
    // Handle both snake_case (from DB) and camelCase (from transformed data)
    const isFriend = friendListNow.some(friend => 
      friend.uniqueId === tiktokUsername || friend.tiktokId === tiktokUsername);
    
    const isUndesirable = undesirablesListNow.some(undesirable => 
      undesirable.uniqueId === tiktokUsername || undesirable.tiktokId === tiktokUsername);

    return {
      isFriend,
      isUndesirable
    }
  }
  
  const playFlaggedCommentSound = () => {
    if (flaggedCommentSoundRef.current) {
      flaggedCommentSoundRef.current.play().catch(e => console.error('Error playing sound', e))
    }
  }
  
  const updateModerationStats = (moderationResult) => {
    setModerationStats(prevStats => {
      const newStats = {...prevStats}
      newStats.total += 1
      
      if (moderationResult.flagged) {
        newStats.flagged += 1
        
        // Update category counts if available
        if (moderationResult.categories) {
          Object.keys(moderationResult.categories).forEach(category => {
            if (moderationResult.categories[category] && newStats.categories[category] !== undefined) {
              newStats.categories[category] += 1
            }
          })
        }
      } else {
        newStats.safe += 1
      }
      
      return newStats
    })
  }
  
  // Load user lists from API
  const loadUserLists = async () => {
    try {
      const data = await UserApi.loadUserLists()
      // The API returns {friendsList, undesirablesList}, ensure we extract arrays
      setFriendsList(Array.isArray(data.friendsList) ? data.friendsList : [])
      setUndesirablesList(Array.isArray(data.undesirablesList) ? data.undesirablesList : [])
      //save to local storage
      localStorage.setItem('friendsList', JSON.stringify(data.friendsList))
      localStorage.setItem('undesirablesList', JSON.stringify(data.undesirablesList))
    } catch (error) {
      console.error('Error loading user lists:', error)
      
      // Fallback to localStorage if API fails
      const savedFriends = localStorage.getItem('friendsList')
      const savedUndesirables = localStorage.getItem('undesirablesList')
      
      if (savedFriends) {
        try {
          setFriendsList(JSON.parse(savedFriends))
        } catch (e) {
          console.error('Error parsing friends list from localStorage:', e)
          setFriendsList([])
        }
      }
      
      if (savedUndesirables) {
        try {
          setUndesirablesList(JSON.parse(savedUndesirables))
        } catch (e) {
          console.error('Error parsing undesirables list from localStorage:', e)
          setUndesirablesList([])
        }
      }
    }
  }
  
  // Add user to friends list
  const addToFriendsList = async (user) => {
    try {
      const response = await UserApi.addToFriendsList(user)
      // API now directly returns the updated array
      setFriendsList(response || [])
    } catch (error) {
      console.error('Error adding friend:', error)
      
      // Fallback - add locally
      const newFriend = {
        uniqueId: user.uniqueId,
        userId: user.uniqueId, // For backward compatibility, use uniqueId as userId
        nickname: user.nickname,
        profilePictureUrl: user.profilePictureUrl,
        addedAt: new Date().toISOString()
      }
      
      setFriendsList(prevList => {
        // Don't add duplicates
        if (prevList.some(item => item.uniqueId === user.uniqueId || item.tiktokId === user.uniqueId)) {
          return prevList
        }
        
        const newList = [...prevList, newFriend]
        localStorage.setItem('friendsList', JSON.stringify(newList))
        return newList
      })
    }
    
    // Remove from undesirables if present
    setUndesirablesList(prevList => {
      const newList = prevList.filter(item => !(item.uniqueId === user.uniqueId || item.tiktokId === user.uniqueId))
      localStorage.setItem('undesirablesList', JSON.stringify(newList))
      return newList
    })
    loadUserLists();

    // Update the userStatus for all existing chat messages
    updateChatMessagesStatus(user.uniqueId, {isFriend: true, isUndesirable: false})
  }
  
  // Add user to undesirables list
  const addToUndesirablesList = async (user,reason = '') => {
    try {
      if(reason == ""){
        //ask for reason in a input box
         reason = prompt("Enter reason for adding to undesirables list")
      }
      
      const response = await UserApi.addToUndesirablesList(user,reason)
      // API now directly returns the updated array
      setUndesirablesList(response || [])
    } catch (error) {
      console.error('Error adding undesirable:', error)
      
      // Fallback - add locally
      const newUndesirable = {
        uniqueId: user.uniqueId,
        userId: user.uniqueId, // For backward compatibility, use uniqueId as userId
        nickname: user.nickname,
        profilePictureUrl: user.profilePictureUrl,
        reason: reason,
        addedAt: new Date().toISOString()
      }
      
      setUndesirablesList(prevList => {
        // Don't add duplicates
        if (prevList.some(item => item.uniqueId === user.uniqueId || item.tiktokId === user.uniqueId)) {
          return prevList
        }
        
        const newList = [...prevList, newUndesirable]
        localStorage.setItem('undesirablesList', JSON.stringify(newList))
        return newList
      })
    }
    
    // Remove from friends if present
    setFriendsList(prevList => {
      const newList = prevList.filter(item => !(item.uniqueId === user.uniqueId || item.tiktokId === user.uniqueId))
      localStorage.setItem('friendsList', JSON.stringify(newList))
      return newList
    })

    loadUserLists();

    // Update the userStatus for all existing chat messages
    updateChatMessagesStatus(user.uniqueId, {isFriend: false, isUndesirable: true})
  }
  
  // Remove user from friends list
  const removeFriend = async (uniqueId) => {
    try {
      const response = await UserApi.removeFriend(uniqueId)
      // API now directly returns the updated array
      setFriendsList(response || [])
    } catch (error) {
      console.error('Error removing friend:', error)
      
      // Fallback - remove locally
      setFriendsList(prevList => {
        const newList = prevList.filter(item => !(item.uniqueId === uniqueId || item.tiktokId === uniqueId))
        localStorage.setItem('friendsList', JSON.stringify(newList))
        return newList
      })
    }

    loadUserLists();

    // Update the userStatus for all existing chat messages
    updateChatMessagesStatus(uniqueId, {isFriend: false, isUndesirable: false})
  }
  
  // Remove user from undesirables list
  const removeUndesirable = async (uniqueId) => {
    try {
      const response = await UserApi.removeUndesirable(uniqueId)
      // API now directly returns the updated array
      setUndesirablesList(response || [])
    } catch (error) {
      console.error('Error removing undesirable:', error)
      
      // Fallback - remove locally
      setUndesirablesList(prevList => {
        const newList = prevList.filter(item => !(item.uniqueId === uniqueId || item.tiktokId === uniqueId))
        localStorage.setItem('undesirablesList', JSON.stringify(newList))
        return newList
      })
    }

    loadUserLists();

    // Update the userStatus for all existing chat messages
    updateChatMessagesStatus(uniqueId, {isFriend: false, isUndesirable: false})
  }
  
  // New helper function to update the userStatus for all existing chat messages
  const updateChatMessagesStatus = (uniqueId, newStatus) => {
    setChatMessages(prevMessages => {
      return prevMessages.map(msg => {
        if (msg.uniqueId === uniqueId) {
          return { ...msg, userStatus: newStatus }
        }
        return msg
      })
    })

    // Also update mazic list if needed
    setMazicList(prevList => {
      return prevList.map(item => {
        if (item.uniqueId === uniqueId) {
          return { ...item, userStatus: newStatus }
        }
        return item
      })
    })

    // Also update likes array for top likers
    setLikes(prevLikes => {
      return prevLikes.map(liker => {
        if (liker.uniqueId === uniqueId) {
          return { ...liker, userStatus: newStatus }
        }
        return liker
      })
    })

    console.log(`User ${uniqueId} status updated across the app: ${JSON.stringify(newStatus)}`)
  }
  
  // Toggle user lists panel
  const toggleUserLists = () => {
    setShowUserLists(prev => !prev)
  }
  
  // Sanitize text to prevent XSS
  const sanitize = (text) => {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
  
  // Function to show moderation notification
  const showModerationNotification = (data, text, moderationResult) => {
    // Get the reason for flagging
    let reason = '';
    if (moderationResult.categories) {
      for (const category in moderationResult.categories) {
        if (moderationResult.categories[category]) {
          reason += (reason ? ', ' : '') + category;
        }
      }
    }
    
    // Add to notifications
    const notification = {
      id: Date.now(),
      type: 'moderation',
      title: `Contenu inapproprié détecté de ${data.nickname}`,
      message: data.comment,
      reason: reason || 'Non spécifié',
      timestamp: new Date()
    };
    
    setNotifications(prev => [...prev, notification]);
    
    // Remove after 5 seconds
    setTimeout(() => {
      removeNotification(notification.id);
    }, 15000);
  }
  
  // Function to show mention notification
  const showMentionNotification = (data) => {
    // Add to notifications
    const notification = {
      id: Date.now(),
      type: 'mention',
      title: `${data.uniqueId} vous a mentionné`,
      message: data.comment,
      timestamp: new Date()
    };
    
    setNotifications(prev => [...prev, notification]);
    
    // Remove after 5 seconds
    setTimeout(() => {
      removeNotification(notification.id);
    }, 5000);
    
    // Try to show browser notification if permission is granted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`${data.uniqueId} vous a mentionné`, {
        body: data.comment,
        icon: data.profilePictureUrl
      });
    }
  }
  
  // Function to remove a notification
  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }
  
  // Function to request browser notification permission
  const requestNotificationPermission = () => {
    if ('Notification' in window) {
      Notification.requestPermission().then((permission) => {
        // Permission handled
        console.log("Notification permission requested");
        console.log(permission);
      });
    }
  }
  
  // Function to show user join notification
  const showUserJoinNotification = (data, userStatus) => {
    // Determine user type for notification
    let userType = '';
    let notificationType = '';
    
    if (userStatus.isFriend) {
      userType = 'Ami';
      notificationType = 'friend-join';
    } else if (userStatus.isUndesirable) {
      userType = 'Indésirable';
      notificationType = 'undesirable-join';
    } else {
      // Not a special user, don't show notification
      return;
    }
    
    // Add to notifications
    const notification = {
      id: Date.now(),
      type: notificationType,
      title: `${userType} ${data.nickname} a rejoint le stream`,
      message: `${data.nickname} a rejoint le stream`,
      timestamp: new Date()
    };
    
    setNotifications(prev => [...prev, notification]);
    
    // Remove after 5 seconds
    setTimeout(() => {
      removeNotification(notification.id);
    }, 5000);
    
    // Try to show browser notification if permission is granted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`${userType} ${data.nickname} a rejoint`, {
        body: `${data.nickname} a rejoint le stream`,
        icon: data.profilePictureUrl
      });
    }
  }
  
  // Function to process messages with current prefix
  const processMessageWithCurrentPrefix = (data) => {
    let savedPrefix = localStorage.getItem('mazicPrefix');
    
    if (savedPrefix) {
      setMazicPrefix(savedPrefix);
    } else {
      setMazicPrefix('mazic:');
      localStorage.setItem('mazicPrefix', 'mazic:');
      savedPrefix = 'mazic:';
    }
    console.log("Got the prefix :" + savedPrefix);
    if (data.comment.toLowerCase().startsWith(savedPrefix.toLowerCase())) {
      console.log("Found the prefix");
      console.log("Got the comment :" + data.comment);
      
      // Get the user's status for highlighting in the mazic list
      const userStatus = data.userStatus || checkUserStatus(data);
      
      // Add user status info to the mazic entry
      const restOfComment = data.nickname + ": " + data.comment.slice(savedPrefix.length);
      const mazicEntry = {
        text: restOfComment,
        uniqueId: data.uniqueId,
        userStatus: userStatus
      };
      
      setMazicList(prevList => [...prevList, mazicEntry]);
    }
  };
  
  // Function to clear the mazic list
  const clearMazicList = () => {
    setMazicList([]);
  }
  
  // Function to remove a single message from the mazic list
  const removeFromMazicList = (index) => {
    setMazicList(prevList => {
      const newList = [...prevList];
      newList.splice(index, 1);
      return newList;
    });
  }
  
  // Update mazicPrefix and save to localStorage
  const updateMazicPrefix = (newPrefix) => {
    setMazicPrefix(newPrefix);
    localStorage.setItem('mazicPrefix', newPrefix);
    
    // Reprocess all existing messages with the new prefix
    setMazicList([]); // Clear existing list
    
    // Apply new prefix to all stored messages
    const newMazicMessages = [];
    
    allChatMessages.forEach(msg => {
      if (msg.comment && msg.comment.toLowerCase().startsWith(newPrefix.toLowerCase())) {
        const restOfComment = msg.nickname + ": " + msg.comment.slice(newPrefix.length);
        
        // Create a mazic entry with user status
        const userStatus = msg.userStatus || checkUserStatus(msg);
        const mazicEntry = {
          text: restOfComment,
          uniqueId: msg.uniqueId,
          userStatus: userStatus
        };
        
        newMazicMessages.push(mazicEntry);
      }
    });
    
    // Update the mazic list with all matching messages
    setMazicList(newMazicMessages);
    
    // Display a console log that future messages will be filtered with this prefix
    console.log(`Filtrage des messages avec le nouveau préfixe : "${newPrefix}"`);
    
    // Try to save to API if that functionality is added later
    
  };
  
  return (
    <div className={`min-h-screen w-full bg-gray-950 text-white ${darkTheme ? 'dark' : 'light'}`}>
      <Notifications 
        notifications={notifications} 
        removeNotification={removeNotification} 
      />
      
      {/* Toggle button for user lists */}
      <button 
        id="toggleUserLists" 
        className="fixed top-4 left-4 z-50 flex items-center bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg shadow-lg transition-colors"
        onClick={toggleUserLists}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
        </svg>
        Gérer les listes
      </button>
      
      {/* User Lists Panel */}
      <UserLists 
        friendsList={friendsList}
        undesirablesList={undesirablesList}
        removeFriend={removeFriend}
        removeUndesirable={removeUndesirable}
        addToFriendsList={addToFriendsList}
        addToUndesirablesList={addToUndesirablesList}
        showUserLists={showUserLists}
        toggleUserLists={toggleUserLists}
      />
      
      <header className="py-4 px-6 bg-gray-900 border-b border-gray-800">
        <div className="container mx-auto">
          
          {!isConnected ? (
            <div className="max-w-2xl mx-auto">
              <ConnectionForm 
                username={username}
                setUsername={setUsername}
                connect={connect}
                isConnecting={isConnecting}
                sessionId={sessionId}
                setSessionId={setSessionId}
                error={error}
              />
              
              <Settings 
                darkTheme={darkTheme}
                setDarkTheme={handleThemeChange}
                showModeration={showModeration}
                setShowModeration={setShowModeration}
                showAIResponses={showAIResponses}
                setShowAIResponses={setShowAIResponses}
                enableSoundNotifications={enableSoundNotifications}
                setEnableSoundNotifications={setEnableSoundNotifications}
                enableFlvStream={enableFlvStream}
                setEnableFlvStream={setEnableFlvStream}
                enableMentionNotifications={enableMentionNotifications}
                setEnableMentionNotifications={setEnableMentionNotifications}
                yourUsername={yourUsername}
                setYourUsername={setYourUsername}
                botName={botName}
                setBotName={setBotName}
                aiProvider={aiProvider}
                setAiProvider={setAiProvider}
                aiModel={aiModel}
                setAiModel={setAiModel}
                openaiApiKey={openaiApiKey}
                setOpenaiApiKey={setOpenaiApiKey}
                availableOllamaModels={availableOllamaModels}
                tavilyApiKey={tavilyApiKey}
                setTavilyApiKey={setTavilyApiKey}
                setAvailableOllamaModels={setAvailableOllamaModels}
              />
            </div>
          ) : (
            <div className="flex flex-col md:flex-row justify-between">
              <div className="flex justify-around p-4 my-3 bg-gradient-to-r from-gray-800/80 to-gray-900/80 backdrop-blur-md rounded-2xl shadow-lg border border-gray-700/30">

                <h2 className="text-xl font-semibold text-white flex items-center">
                  <span className="mr-2">Connecté à:</span>
                  <span className="bg-primary/20 text-primary border border-primary/30 px-3 py-1 rounded-full">
                    @{username}
                  </span>
                </h2>
              </div>
              <StatsBar 
                viewerCount={viewerCount}
                likeCount={likeCount}
                diamondsCount={diamondsCount}
              />
              <div className="flex justify-around p-4 my-3">

                <button 
                  onClick={disconnect} 
                  className="h-10 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl shadow-lg transition-colors"
                >
                  Déconnecter
                </button>
              </div>
            </div>
          )}
        </div>
      </header>
      
      {isConnected && (
        <main className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3 space-y-6">
              <VideoPlayer 
                username={username}
                enableFlvStream={enableFlvStream}
                connectionRef={connectionRef}
                openaiApiKey={openaiApiKey}
              />
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <ChatContainer 
                    chatMessages={chatMessages}
                    showModeration={showModeration}
                    showAIResponses={showAIResponses}
                    addToFriendsList={addToFriendsList}
                    addToUndesirablesList={addToUndesirablesList}
                    autoScroll={autoScroll}
                    setAutoScroll={setAutoScroll}
                    isGeneratingResponse={isGeneratingResponse}
                    botNames={botName}
                  />
                </div>
                <div className="lg:col-span-1">
            <MazicList 
                mazicList={mazicList} 
                clearMazicList={clearMazicList} 
                removeFromMazicList={removeFromMazicList}
                mazicPrefix={mazicPrefix}
                setMazicPrefix={updateMazicPrefix}
              />
              </div>
              </div>
            </div>
            
            
            <div className="lg:col-span-1 space-y-6">
              {showModeration && (
                <ModerationStats moderationStats={moderationStats} />
              )}
              
              <TopLikers likers={likes} />
              <GiftsContainer gifts={gifts} />
            </div>
          </div>
        </main>
      )}
    </div>
  )
}

export default App
