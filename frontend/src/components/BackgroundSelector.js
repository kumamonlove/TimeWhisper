import React, { useState } from 'react';
import beijin1 from '../assets/beijin1.jpg';
import beijin2 from '../assets/beijin2.jpg';
import beijin3 from '../assets/beijin3.jpg';
import { AiOutlinePicture, AiOutlineSwap } from 'react-icons/ai';

const BackgroundSelector = ({ onSelectBackground }) => {
  const [showOptions, setShowOptions] = useState(false);
  
  const backgrounds = [
    { id: 'beijin1', src: beijin1, thumbnail: beijin1, name: 'Wallpaper 1' },
    { id: 'beijin2', src: beijin2, thumbnail: beijin2, name: 'Wallpaper 2' },
    { id: 'beijin3', src: beijin3, thumbnail: beijin3, name: 'Wallpaper 3' }
  ];

  const handleBackgroundSelect = (id, src) => {
    onSelectBackground(id, src);
    setShowOptions(false);
  };

  return (
    <div className="background-selector">
      <div 
        className="selector-toggle"
        onClick={() => setShowOptions(!showOptions)}
      >
        <AiOutlineSwap />
        <span>Change Background</span>
      </div>
      {showOptions && (
        <div className="background-options">
          {backgrounds.map(bg => (
            <div 
              key={bg.id}
              className="background-option"
              onClick={() => handleBackgroundSelect(bg.id, bg.src)}
            >
              <img src={bg.thumbnail} alt={bg.name} />
              <span>{bg.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BackgroundSelector; 