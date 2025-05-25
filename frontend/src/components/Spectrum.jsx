import React, { useRef, useEffect, useState } from "react";
import brainImage from '../assets/brain.png';

const labels = [
  "Complètement d'accord",
  "D'accord",
  "Un peu d'accord",
  "Neutre",
  "Un peu en désaccord",
  "En désaccord",
  "Complètement en désaccord",
];

const segmentColors = [
  "#f48be3", // light pink-purple
  "#e16be2", // pinkish purple
  "#c44fd9", // medium purple
  "#a13fd1", // classic purple
  "#7b2fc9", // deep purple
  "#5a23b6", // indigo purple
  "#3a1fa6", // blueish purple
];

const centerLabels = [
  "Indifférent ou sans avis",
  "Pas répondu encore"
];




const Spectrum = ({ size = 1920 ,chatMessages=[]}) => {
  console.log(chatMessages[chatMessages.length - 1]);
  const canvasRef = useRef(null);
  const width = size;
  const height = size * 0.6; // semi-circle, so less height

  const [claim,setClaim] = useState("Le Developpement React, c'est bien mieux que le Developpement Angular");
  const [tempClaim, setTempClaim] = useState(claim);
  const [claimsHistory, setClaimsHistory] = useState([{
    text: claim,
    timestamp: Date.now()
  }]);

  // Find the longest label for consistent spacing
  const longestLabel = labels.reduce((a, b) => a.length > b.length ? a : b);
  const charWidth = 12; // Approximate width of each character in pixels
  const totalTextWidth = charWidth * longestLabel.length*0.9;

  const [publicData, setPublicData] = useState([0,0,0,0,0,0,0]);  //sum of number of user that have the same spectrum from the labels. It is an array of 7 elements
  const [spectrumUserData, setSpectrumUserData] = useState([]);  //array of users with their spectrum data. userId is unique so it is a set
  const [showPublic, setShowPublic] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingSpectrumUsers, setPendingSpectrumUsers] = useState([]); // Track users who haven't provided a value

  const [allUsers, setAllUsers] = useState([]);
  const [spectrumUsers, setSpectrumUsers] = useState([]);
  const [processedMessages, setProcessedMessages] = useState(new Set());

  //message  has nickname,profilePictureUrl,uniqueId and userId and createTime(unix timestamp)

  //if message.comment is not null or undefined the comment will be analysed to get the spectrum
  

  const addUserToSpectrumUsers = (user) => {
    setSpectrumUsers([...spectrumUsers, user]);
    setPendingSpectrumUsers([...pendingSpectrumUsers, user]); // Add to pending users
  }

  const removeUserFromSpectrumUsers = (user) => {
    setSpectrumUsers(spectrumUsers.filter(u => u.userId !== user.userId));
    setPendingSpectrumUsers(pendingSpectrumUsers.filter(u => u.userId !== user.userId));
  }

  const parseSpectrumMessage = (message) => {
    if (!message.comment) return;

    if(message.nickname=="SamLePirate"){
      //if the comment is a claim, set the claim
      const match = message.comment.match(/^claim\s*:\s*([^\n]+)$/i);
      if (match) {
        setClaim(match[1]);
        return;
      }
    }
    
    const match = message.comment.match(/^spectrum\s*:\s*([0-6])$/i);
    if (!match) return;
    
    const spectrumValue = parseInt(match[1]);
    const isSpectrumUser = spectrumUsers.some(u => u.userId === message.userId);
    
    if (isSpectrumUser) {
      // Remove from pending users when they provide a value
      setPendingSpectrumUsers(prev => prev.filter(u => u.userId !== message.userId));
      
      // Add to spectrumUserData, ensuring unique userIds
      setSpectrumUserData(prev => {
        const filteredData = prev.filter(user => user.userId !== message.userId);
        return [...filteredData, {
          userId: message.userId,
          nickname: message.nickname,
          profilePictureUrl: message.profilePictureUrl,
          spectrumValue
        }];
      });
    } else {
      // Update public data
      console.log("update public data");
      console.log(spectrumValue);
      setPublicData(prev => {
        const newData = [...prev];
        newData[spectrumValue] += 1;
        return newData;
      });
    }
  };

  //for each message, add the user to the allUsers array if they are not already in it
  useEffect(() => {
    // Only process messages that are newer than startTime and haven't been processed yet
    const newMessages = chatMessages.filter(message => 
      message.createTime >= startTime && 
      !processedMessages.has(message.createTime.toString())
    );
    
    newMessages.forEach(message => {
      if (!allUsers.some(u => u.userId === message.userId)) {
        setAllUsers([...allUsers,{userId:message.userId,nickname:message.nickname,profilePictureUrl:message.profilePictureUrl}]);
      }
      parseSpectrumMessage(message);
      // Mark message as processed using createTime
      setProcessedMessages(prev => new Set([...prev, message.createTime.toString()]));
    });
  }, [chatMessages]);





  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, width, height);
    //white background
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);

    //draw claim
    ctx.fillStyle = "#000";
    
    ctx.font = "bold 48px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(claim, width / 2, height * 0.1);
    

    // Parameters
    const cx = width / 2;
    const cy = height * 0.98 - width * 0.45 * 0.1; // move center up so labels are visible
    const outerRadius = width * 0.45;
    const innerRadius = width * 0.25;
    const centerRadius = width * 0.18;
    const segmentCount = labels.length;
    const startAngle = Math.PI; // left
    const angleStep = Math.PI / segmentCount;

    const sumOfPublicData=publicData.reduce((a, b) => a + b, 0);

    // Draw segments (semi-circle)
    for (let i = 0; i < segmentCount; i++) {
      const segStart = startAngle + i * angleStep;
      const segEnd = segStart + angleStep;
      //pourcentage of the segment but logarithmic
      const value = publicData[i]/sumOfPublicData;

      // Draw background segment (low opacity)
      ctx.beginPath();
      ctx.moveTo(
        cx + innerRadius * Math.cos(segStart),
        cy + innerRadius * Math.sin(segStart)
      );
      ctx.arc(cx, cy, outerRadius, segStart, segEnd, false);
      ctx.lineTo(
        cx + innerRadius * Math.cos(segEnd),
        cy + innerRadius * Math.sin(segEnd)
      );
      ctx.arc(cx, cy, innerRadius, segEnd, segStart, true);
      ctx.closePath();
      ctx.fillStyle = hexToRgba(segmentColors[i % segmentColors.length], 1);
      ctx.fill();
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 10;
      ctx.stroke();

      // Draw large sector number
      ctx.save();
      const numberAngle = segStart + angleStep / 2;
      const numberRadius = (outerRadius + innerRadius) / 2;
      const numberX = cx + numberRadius * Math.cos(numberAngle);
      const numberY = cy + numberRadius * Math.sin(numberAngle);
      
      ctx.translate(numberX, numberY);
      ctx.rotate(numberAngle + Math.PI / 2);
      ctx.fillStyle = "rgba(254, 254, 254, 0.3)"; // Semi-transparent gray
      ctx.font = "bold 120px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(i.toString(), 0, 0);
      ctx.restore();

      //only if showPublic is true
      // Draw gauge (filled part, opacity mapped to value)
      if (showPublic) {
        const gaugeRadius = innerRadius + (outerRadius - innerRadius) * value;
        ctx.beginPath();
        ctx.moveTo(
            cx + innerRadius * Math.cos(segStart),
            cy + innerRadius * Math.sin(segStart)
        );
        ctx.arc(cx, cy, gaugeRadius, segStart, segEnd, false);
        ctx.lineTo(
            cx + innerRadius * Math.cos(segEnd),
            cy + innerRadius * Math.sin(segEnd)
        );
        ctx.arc(cx, cy, innerRadius, segEnd, segStart, true);
        ctx.closePath();
        ctx.fillStyle = hexToRgba("#ccc", 0.5); // opacity = value
        ctx.fill();
      }

      // Draw arrows from center to each spectrum user's sector
      const sectorUserCounts = {};
      spectrumUserData.forEach(user => {
        sectorUserCounts[user.spectrumValue] = (sectorUserCounts[user.spectrumValue] || 0) + 1;
      });

      Object.entries(sectorUserCounts).forEach(([sectorValue, count]) => {
        const sectorIndex = parseInt(sectorValue);
        const segStart = startAngle + sectorIndex * angleStep;
        const segEnd = segStart + angleStep;
        const sectorCenterAngle = segStart + angleStep / 2;
        
        // Calculate arrow width based on number of users in sector
        const baseWidth = 5;
        const maxWidth = 100;
        const arrowWidth = Math.min(baseWidth + (count * 10), maxWidth)*2;
        
        // Draw arrow
        ctx.save();
        ctx.beginPath();
        
        // Calculate arrow points
        const startX = cx + (280) * Math.cos(sectorCenterAngle);
        const startY = cy + (280) * Math.sin(sectorCenterAngle);
        const endX = cx + (innerRadius) * Math.cos(sectorCenterAngle);
        const endY = cy + (innerRadius) * Math.sin(sectorCenterAngle);
        
        // Calculate perpendicular offset for arrow width
        const perpAngle = sectorCenterAngle + Math.PI / 2;
        const offsetX = Math.cos(perpAngle) * (arrowWidth / 2);
        const offsetY = Math.sin(perpAngle) * (arrowWidth / 2);
        
        // Draw arrow as a triangle
        ctx.beginPath();
        ctx.moveTo(startX + offsetX, startY + offsetY); // Base right point
        ctx.lineTo(startX - offsetX, startY - offsetY); // Base left point
        ctx.lineTo(endX, endY); // Point at center
        ctx.closePath();
        
        // Fill arrow with semi-transparent color
        ctx.fillStyle = hexToRgba(segmentColors[sectorIndex % segmentColors.length], 0.6);
        ctx.fillStyle = "#000";
        ctx.fill();
        
        // Draw arrow outline
        ctx.strokeStyle = hexToRgba(segmentColors[sectorIndex % segmentColors.length], 0.8);
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.restore();
      });

      // Draw spectrum users in this segment
      const usersInSegment = spectrumUserData.filter(user => user.spectrumValue === i);
      const userRadius = 50;
      const userSpacing = 19;
      const segmentWidth = outerRadius - innerRadius;
      
      // Calculate how many users can fit in the segment
      const segmentAngle = angleStep * 0.8; // Use 80% of the segment angle for user placement
      const maxUsersPerRow = Math.floor(segmentAngle / (Math.asin((userRadius * 2 + userSpacing) / (innerRadius + segmentWidth/2))));
      
      usersInSegment.forEach((user, userIndex) => {
        // Calculate position within segment
        const row = Math.floor(userIndex / maxUsersPerRow);
        const col = userIndex % maxUsersPerRow;
        
        // Calculate angle within the segment (centered)
        const angleOffset = (segmentAngle * 0.30); // Start at 10% of segment
        const angleStep = (segmentAngle * 0.70) / (maxUsersPerRow - 1); // Use 80% of segment for spacing
        const angle = segStart + angleOffset + (col * angleStep);
        
        // Calculate radius (centered in the segment width)
        const radius = innerRadius + (segmentWidth * 0.2) + (row * (userRadius * 2 + userSpacing));
        
        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);
        
        // Draw user image
        const img = new Image();
        img.src = user.profilePictureUrl;
        img.onload = () => {
          ctx.save();
          ctx.beginPath();
          ctx.arc(x, y, userRadius, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(img, x - userRadius, y - userRadius, userRadius * 2, userRadius * 2);
          ctx.restore();
          
          // Draw nickname below image with larger font
          ctx.save();
          ctx.translate(x, y + userRadius + 15);
          //ctx.rotate(angle + Math.PI / 2);
          ctx.fillStyle = "#000";
          ctx.font = "bold 16px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          //white background rectangle just under the nickname, based on the length of the nickname
          ctx.fillStyle = "#fff";
          ctx.strokeStyle = "#000";
          ctx.lineWidth = 2;
          ctx.fillRect(-(user.nickname.length*10)/2, -15, user.nickname.length*10, 25);
          ctx.strokeRect(-(user.nickname.length*10)/2, -15, user.nickname.length*10, 25);
          ctx.fillStyle = "#000";
          ctx.fillText(user.nickname, 0, 0);
          ctx.restore();
        };
      });

      // draw label in the center of the segment with rotation
      ctx.save();
      const labelAngle = segStart + angleStep / 2;
      const labelRadius = (outerRadius + innerRadius) / 2;
      
      // Calculate points along the arc for the text
      const text = labels[i];
      const totalAngle = angleStep * 0.9; // Use 80% of the segment angle
      const arcLength = labelRadius * totalAngle; // Total arc length
      const spacing = (arcLength - totalTextWidth) / (longestLabel.length - 1);
      const anglePerChar = (charWidth + spacing) / labelRadius;
      
      // Draw each character along the arc
      for (let j = 0; j < text.length; j++) {
        const charAngleOffset = (j - (text.length - 1) / 2) * anglePerChar;
        const currentAngle = labelAngle + charAngleOffset;
        
        ctx.save();
        ctx.translate(
          cx + labelRadius * Math.cos(currentAngle),
          cy + labelRadius * Math.sin(currentAngle)
        );
        ctx.rotate(currentAngle + Math.PI / 2);
        
        ctx.fillStyle = "#FFF";
        ctx.font = "bold 28px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text[j], 0, -150);
        ctx.restore();
      }
      ctx.restore();
    }

    // Draw center circle (bottom center of semi-circle)
    ctx.beginPath();
    
    ctx.arc(cx, cy, centerRadius, Math.PI, 2 * Math.PI);
    ctx.lineTo(cx + centerRadius, cy);
    ctx.arc(cx, cy, centerRadius, 0, Math.PI, true);
    ctx.closePath();
    ctx.fillStyle = "#64748b"; // slate-500
    ctx.fill();

    // Draw brain image in center
    const brainSize = centerRadius * 2; // Make brain slightly larger than center circle
    
    // Create a Promise for loading the brain image
    const loadBrainImage = () => {
      return new Promise((resolve) => {
        const img = new Image();
        img.src = brainImage;
        img.onload = () => {
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, centerRadius, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          
          // Create a temporary canvas to process the image
          const tempCanvas = document.createElement('canvas');
          const tempCtx = tempCanvas.getContext('2d');
          tempCanvas.width = brainSize;
          tempCanvas.height = brainSize;
          
          // Draw the image on the temporary canvas
          tempCtx.drawImage(img, 0, -120, brainSize, brainSize);
          
          // Get the image data
          const imageData = tempCtx.getImageData(0, 0, brainSize, brainSize);
          const data = imageData.data;
          
          // Make white pixels transparent
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            // If the pixel is white (or very close to white)
            if (r > 240 && g > 240 && b > 240) {
              data[i + 3] = 0; // Set alpha to 0 (transparent)
            }
          }
          
          // Put the modified image data back
          tempCtx.putImageData(imageData, 0, 0);
          
          // Draw the processed image on the main canvas
          ctx.drawImage(tempCanvas, cx - brainSize/2, cy - brainSize/2);
          ctx.restore();
          resolve();
        };
      });
    };

    // Create a Promise for loading user images
    const loadUserImages = () => {
      return new Promise((resolve) => {
        const userRadius = 60;
        const userSpacing = 60;
        const gridSize = 3; // 3x3 grid
        const totalGridWidth = (userRadius * 2 * gridSize) + (userSpacing * (gridSize - 1));
        const startX = cx - (totalGridWidth / 2) + userRadius;
        const startY = cy - (totalGridWidth / 2) + userRadius - 170;
        
        const userPromises = pendingSpectrumUsers.slice(0, 9).map((user, userIndex) => {
          return new Promise((resolveUser) => {
            const row = Math.floor(userIndex / gridSize);
            const col = userIndex % gridSize;
            
            // Calculate position within the 3x3 grid
            const x = startX + (col * (userRadius * 2 + userSpacing));
            const y = startY + (row * (userRadius * 2 + userSpacing));
            
            // Draw user image
            const img = new Image();
            img.src = user.profilePictureUrl;
            img.onload = () => {
              ctx.save();
              ctx.beginPath();
              ctx.arc(x, y, userRadius, 0, Math.PI * 2);
              ctx.closePath();
              ctx.clip();
              ctx.drawImage(img, x - userRadius, y - userRadius, userRadius * 2, userRadius * 2);
              ctx.restore();
              
              // Draw nickname below image
              ctx.save();
              ctx.translate(x, y + userRadius + 15);
              ctx.fillStyle = "#000";
              ctx.font = "bold 16px Arial";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              //white background rectangle just under the nickname, based on the length of the nickname
              ctx.fillStyle = "#fff";
              ctx.strokeStyle = "#000";
              ctx.lineWidth = 2;
              ctx.fillRect(-(user.nickname.length*10)/2, -15, user.nickname.length*10, 25);
              ctx.strokeRect(-(user.nickname.length*10)/2, -15, user.nickname.length*10, 25);
              ctx.fillStyle = "#000";
              ctx.fillText(user.nickname, 0, 0);
              ctx.restore();
              resolveUser();
            };
          });
        });

        Promise.all(userPromises).then(() => resolve());
      });
    };

    // Execute the drawing operations in sequence
    loadBrainImage().then(() => loadUserImages());
  }, [width, height, publicData, spectrumUserData, showPublic, claim, pendingSpectrumUsers]);

  // Helper to convert hex color to rgba with opacity
  function hexToRgba(hex, alpha) {
    let c = hex.replace('#', '');
    if (c.length === 3) {
      c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
    }
    const num = parseInt(c, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  return (
    <div>
      <button onClick={() => setShowPublic(!showPublic)}>
        {showPublic ? "Hide public" : "Show public"}
      </button>
      <button onClick={() => {
        setPublicData([0,0,0,0,0,0,0]);
        setSpectrumUserData([]);
        //setAllUsers([]);
        setSpectrumUsers([]);
        setProcessedMessages(new Set());
        setStartTime(Date.now()); // Reset start time to current time
      }}> Reset All Data</button>
      <p>{chatMessages.length} messages</p>

      

      <div style={{ display: 'flex', gap: '2rem', padding: '1rem' ,justifyContent: 'center'}}>
        <input
          type="text"
          value={tempClaim}
          onChange={(e) => setTempClaim(e.target.value)}
          style={{
            backgroundColor: '#fff',
            color: '#000',
            padding: '0.5rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '1rem',
            width: '80%',
            maxWidth: '800px'
          }}
        />
        <button
          onClick={() => {
            setClaim(tempClaim);
            setClaimsHistory(prev => [...prev, {
              text: tempClaim,
              timestamp: Date.now()
            }]);
          }}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#4f46e5',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          Save Claim
        </button>
      </div>

      <div style={{ display: 'flex', gap: '2rem', padding: '1rem' ,justifyContent: 'center'}}>
        <span style={{ backgroundColor: '#fff', color: '#000', padding: '0.5rem'}}>Tapez spectrum:0 pour avoir un avis très négatif, spectrum:6 pour avoir un avis très positif</span>
      </div>
      
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ width: "100%", height: "auto", display: "block" }}
      />
      <div style={{ display: 'flex', gap: '2rem', padding: '1rem' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ marginBottom: '1rem', color: '#333' }}>All Users</h3>
          <div style={{ marginBottom: '1rem' }}>
            <input
              type="text"
              placeholder="Search by nickname..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid #e2e8f0',
                fontSize: '1rem'
              }}
            />
          </div>
          <div style={{ 
            maxHeight: '400px', 
            overflowY: 'auto',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '1rem'
          }}>
            {allUsers
              .filter(user => 
                user.nickname.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map(user => (
              <div key={user.userId} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.5rem',
                borderBottom: '1px solid #e2e8f0',
                marginBottom: '0.5rem'
              }}>
                <img 
                  src={user.profilePictureUrl} 
                  alt={user.nickname} 
                  style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '50%',
                    objectFit: 'cover'
                  }} 
                />
                <p style={{ margin: 0, flex: 1 }}>{user.nickname}</p>
                <button 
                  onClick={() => addUserToSpectrumUsers(user)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#4f46e5',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <h3 style={{ marginBottom: '1rem', color: '#333' }}>Spectrum Users</h3>
          <div style={{ 
            maxHeight: '400px', 
            overflowY: 'auto',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '1rem'
          }}>
            {spectrumUsers.map(user => (
              <div key={user.userId} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.5rem',
                borderBottom: '1px solid #e2e8f0',
                marginBottom: '0.5rem'
              }}>
                <img 
                  src={user.profilePictureUrl} 
                  alt={user.nickname} 
                  style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '50%',
                    objectFit: 'cover'
                  }} 
                />
                <p style={{ margin: 0, flex: 1 }}>{user.nickname}</p>
                <button 
                  onClick={() => removeUserFromSpectrumUsers(user)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ 
        maxHeight: '200px', 
        overflowY: 'auto',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '1rem',
        margin: '1rem',
        backgroundColor: '#f8fafc'
      }}>
        <h3 style={{ marginBottom: '1rem', color: '#333' }}>Claims History</h3>
        {claimsHistory.map((claim) => (
          <div key={claim.timestamp} style={{
            padding: '0.5rem',
            borderBottom: '1px solid #e2e8f0',
            marginBottom: '0.5rem'
          }}>
            <p style={{ margin: 0, color: '#1e293b' }}>{claim.text}</p>
            <small style={{ color: '#64748b' }}>
              {new Date(claim.timestamp).toLocaleString()}
            </small>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Spectrum;
