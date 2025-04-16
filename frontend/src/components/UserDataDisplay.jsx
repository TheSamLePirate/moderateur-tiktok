import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

// Add custom animation for the glow effect
const glowStyles = `
  @keyframes glow-pulse {
    0% { box-shadow: 0 0 5px 2px rgba(16, 185, 129, 0.5); }
    50% { box-shadow: 0 0 10px 4px rgba(16, 185, 129, 0.7); }
    100% { box-shadow: 0 0 5px 2px rgba(16, 185, 129, 0.5); }
  }

  @keyframes glow-pulse-danger {
    0% { box-shadow: 0 0 5px 2px rgba(244, 63, 94, 0.5); }
    50% { box-shadow: 0 0 10px 4px rgba(244, 63, 94, 0.7); }
    100% { box-shadow: 0 0 5px 2px rgba(244, 63, 94, 0.5); }
  }

  .glow-friend {
    animation: glow-pulse 2s infinite ease-in-out;
  }

  .glow-undesirable {
    animation: glow-pulse-danger 2s infinite ease-in-out;
  }
`;

const UserDetailedDisplay = ({ message, position }) => {

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

  if (!message) return null;
  
  const { followerCount, followingCount } = message.followInfo || { followerCount: 0, followingCount: 0 };
  
  return (
    <div 
      className="absolute z-50 bg-gray-800 rounded-lg shadow-xl p-4 w-64 text-white border border-gray-700 transition-opacity duration-200"
      style={{
        left: position?.x || 0,
        top: position?.y || 0
      }}
    >
      <div className="flex items-center mb-3">
        <div className={`${
            message.userStatus.isFriend 
              ? 'ring-4 ring-emerald-500 ring-opacity-90 shadow-xl shadow-emerald-500/60 glow-friend' 
              : message.userStatus.isUndesirable 
                ? 'ring-4 ring-rose-500 ring-opacity-90 shadow-xl shadow-rose-500/60 glow-undesirable' 
                : ''
          } rounded-full w-12 h-12 flex items-center justify-center`}>
          <img 
            src={message.profilePictureUrl} 
            alt="" 
            className="w-full h-full rounded-full object-cover"
            onError={(e) => { e.target.src = 'https://placehold.co/48x48?text=?'; }}
          />
        </div>
        <div className="ml-3">
          <div className="font-bold text-blue-400">{message.nickname}</div>
          <div className="text-xs text-gray-400">@{message.uniqueId}</div>
        </div>
      </div>
      
     
      
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="text-center p-1 bg-gray-700 rounded">
          <div className="font-semibold">{followingCount}</div>
          <div className="text-xs text-gray-400">Following</div>
        </div>
        <div className="text-center p-1 bg-gray-700 rounded">
          <div className="font-semibold">{followerCount}</div>
          <div className="text-xs text-gray-400">Followers</div>
        </div>
      </div>

      {message.userStatus.isFriend && (
        <div className="mt-3 flex flex-wrap gap-1">
          <span className="px-2 py-1 bg-green-900/30 text-green-400 rounded text-xs">Friend</span>
        </div>
      )}

      {message.userStatus.isUndesirable && (
        <div className="mt-3 flex flex-wrap gap-1">
          <span className="px-2 py-1 bg-red-900/30 text-red-400 rounded text-xs">Undesirable</span>
        </div>
      )}
      
      <div className="mt-3 flex flex-wrap gap-1">
        {message.isModerator && (
          <span className="px-2 py-1 bg-green-900/30 text-green-400 rounded text-xs">Moderator</span>
        )}
        {message.isSubscriber && (
          <span className="px-2 py-1 bg-purple-900/30 text-purple-400 rounded text-xs">Subscriber</span>
        )}
        {message.gifterLevel > 0 && (
          <span className="px-2 py-1 bg-amber-900/30 text-amber-400 rounded text-xs">Gifter Lvl {message.gifterLevel}</span>
        )}
        {message.teamMemberLevel > 0 && (
          <span className="px-2 py-1 bg-blue-900/30 text-blue-400 rounded text-xs">Team Member Lvl {message.teamMemberLevel}</span>
        )}
        {message.followRole && (
          <span className="px-2 py-1 bg-pink-900/30 text-pink-400 rounded text-xs">Role :{message.followRole}</span>
        )}
      </div>
    </div>
  );
};

const UserDataDisplay = ({ message, size = 'normal', showNickname = true }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [portalPosition, setPortalPosition] = useState({ x: 0, y: 0 });
  const [portalRoot, setPortalRoot] = useState(null);
  
  // Create portal root when component mounts
  useEffect(() => {
    // Add the styles for glow effect
    const styleTag = document.createElement('style');
    styleTag.innerHTML = glowStyles;
    document.head.appendChild(styleTag);
    
    // Create portal container
    const portalContainer = document.getElementById('portal-root');
    if (!portalContainer) {
      const div = document.createElement('div');
      div.id = 'portal-root';
      document.body.appendChild(div);
      setPortalRoot(div);
    } else {
      setPortalRoot(portalContainer);
    }
    
    return () => {
      document.head.removeChild(styleTag);
    };
  }, []);
  
  // Handle mouse enter to calculate position and show details
  const handleMouseEnter = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setPortalPosition({ 
      x: rect.left, 
      y: rect.bottom + window.scrollY 
    });
    setShowDetails(true);
  };

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

  const { textColor } = getUsernameStyles();
  
  // Get avatar status indicator class
  const getAvatarStatusClass = () => {
    if (message?.userStatus?.isFriend) {
      return "ring-4 ring-emerald-500 ring-opacity-90 shadow-xl shadow-emerald-500/60 glow-friend";
    } else if (message?.userStatus?.isUndesirable) {
      return "ring-4 ring-rose-500 ring-opacity-90 shadow-xl shadow-rose-500/60 glow-undesirable";
    } else {
      return "";
    }
  };

  // Get fallback image based on size
  const getFallbackImage = () => {
    return size === 'small' ? 'https://placehold.co/20x20?text=?' : 'https://placehold.co/32x32?text=?';
  };


  return (
    <div className="relative inline-flex items-center">
      <div 
        className={`relative ${size !== 'small' ? getAvatarStatusClass() : ''} rounded-full ${
          size === 'small' ? 'w-5 h-5' : 'w-8 h-8'
        } flex items-center justify-center mr-2`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setShowDetails(false)}
      >
        <img
          className="w-full h-full rounded-full object-cover cursor-pointer transition-transform hover:scale-110"
          src={message.profilePictureUrl}
          alt=""
          onError={(e) => {
            e.target.src = getFallbackImage();
          }}
        />
      </div>
      {showNickname && (
        <>
        <a
          href={`https://www.tiktok.com/@${message.uniqueId}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`font-bold ${textColor} hover:underline transition-colors mr-2`}
        >
          {message.nickname}
        </a>

        <span>
          {message.type === 'join' ? (
            <div className="text-white/90  p-2.5 rounded-lg break-words">
              a rejoint
            </div>
          ):(
            <div className="text-white/90  p-2.5 rounded-lg break-words">
               {message.comment}
            </div>
          )}
        </span>

        <span>
          {message.type === 'message' && (
            <div className="text-white/90  p-2.5 rounded-lg break-words">
              {message.comment}
            </div>
          )}
        </span>
        </>
      )}
      
      {showDetails && portalRoot && ReactDOM.createPortal(
        <UserDetailedDisplay message={message} position={portalPosition} />,
        portalRoot
      )}
    </div>
  );
};

export default UserDataDisplay; 