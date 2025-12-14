export const avatars = [
  {
    id: "cat",
    name: "Cat",
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="catGrad" cx="50%" cy="30%">
      <stop offset="0%" stop-color="#FFD700"/>
      <stop offset="100%" stop-color="#FFB84D"/>
    </radialGradient>
  </defs>
  <circle cx="50" cy="50" r="45" fill="url(#catGrad)"/>
  <ellipse cx="50" cy="45" rx="35" ry="38" fill="#FFD700" opacity="0.3"/>
  <path d="M 18 18 L 28 12 L 33 22 Z" fill="#FFB84D"/>
  <path d="M 82 18 L 72 12 L 67 22 Z" fill="#FFB84D"/>
  <path d="M 18 18 L 28 12 L 33 22 Z" fill="#000" opacity="0.1"/>
  <path d="M 82 18 L 72 12 L 67 22 Z" fill="#000" opacity="0.1"/>
  <circle cx="38" cy="45" r="9" fill="#000"/>
  <circle cx="62" cy="45" r="9" fill="#000"/>
  <ellipse cx="40" cy="43" rx="4" ry="5" fill="#FFF"/>
  <ellipse cx="60" cy="43" rx="4" ry="5" fill="#FFF"/>
  <circle cx="41" cy="43" r="2" fill="#000"/>
  <circle cx="61" cy="43" r="2" fill="#000"/>
  <path d="M 50 54 L 45 61 L 55 61 Z" fill="#FF1493"/>
  <path d="M 50 54 L 45 61 L 55 61 Z" fill="#000" opacity="0.1"/>
  <path d="M 50 61 Q 44 68 38 65" stroke="#000" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M 50 61 Q 56 68 62 65" stroke="#000" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <ellipse cx="45" cy="70" rx="3" ry="2" fill="#000" opacity="0.2"/>
  <ellipse cx="55" cy="70" rx="3" ry="2" fill="#000" opacity="0.2"/>
</svg>`
  },
  {
    id: "dog",
    name: "Dog",
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="dogGrad" cx="50%" cy="40%">
      <stop offset="0%" stop-color="#E6C89A"/>
      <stop offset="100%" stop-color="#D4A574"/>
    </radialGradient>
  </defs>
  <ellipse cx="50" cy="52" rx="42" ry="40" fill="url(#dogGrad)"/>
  <ellipse cx="50" cy="48" rx="35" ry="35" fill="#E6C89A" opacity="0.4"/>
  <ellipse cx="20" cy="30" rx="10" ry="20" fill="#D4A574" transform="rotate(-25 20 30)"/>
  <ellipse cx="80" cy="30" rx="10" ry="20" fill="#D4A574" transform="rotate(25 80 30)"/>
  <ellipse cx="20" cy="30" rx="6" ry="12" fill="#C19A6B" transform="rotate(-25 20 30)"/>
  <ellipse cx="80" cy="30" rx="6" ry="12" fill="#C19A6B" transform="rotate(25 80 30)"/>
  <circle cx="38" cy="48" r="7.5" fill="#000"/>
  <circle cx="62" cy="48" r="7.5" fill="#000"/>
  <ellipse cx="40" cy="46" rx="3" ry="4" fill="#FFF"/>
  <ellipse cx="60" cy="46" rx="3" ry="4" fill="#FFF"/>
  <circle cx="40.5" cy="46" r="1.5" fill="#000"/>
  <circle cx="60.5" cy="46" r="1.5" fill="#000"/>
  <ellipse cx="50" cy="60" rx="8" ry="6" fill="#000"/>
  <ellipse cx="50" cy="60" rx="5" ry="4" fill="#4A4A4A"/>
  <path d="M 50 66 Q 41 74 34 71" stroke="#000" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  <path d="M 50 66 Q 59 74 66 71" stroke="#000" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  <ellipse cx="50" cy="75" rx="6" ry="5" fill="#FF1493"/>
  <ellipse cx="50" cy="75" rx="4" ry="3" fill="#FF69B4"/>
</svg>`
  },
  {
    id: "bird",
    name: "Bird",
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="birdGrad" cx="50%" cy="40%">
      <stop offset="0%" stop-color="#FFEB3B"/>
      <stop offset="100%" stop-color="#FFD700"/>
    </radialGradient>
  </defs>
  <ellipse cx="50" cy="58" rx="30" ry="35" fill="url(#birdGrad)"/>
  <circle cx="50" cy="32" r="24" fill="url(#birdGrad)"/>
  <ellipse cx="50" cy="30" rx="18" ry="20" fill="#FFEB3B" opacity="0.5"/>
  <path d="M 50 47 L 60 54 L 50 57 Z" fill="#FF4500"/>
  <path d="M 50 47 L 60 54 L 50 57 Z" fill="#000" opacity="0.1"/>
  <circle cx="42" cy="30" r="6.5" fill="#000"/>
  <ellipse cx="44" cy="28" rx="3" ry="4" fill="#FFF"/>
  <circle cx="44.5" cy="28" r="1.5" fill="#000"/>
  <ellipse cx="45" cy="62" rx="14" ry="20" fill="#FFC107"/>
  <ellipse cx="45" cy="62" rx="10" ry="15" fill="#FFD700" opacity="0.5"/>
  <path d="M 22 58 Q 8 45 5 55 Q 8 65 22 58" fill="#FFC107"/>
  <path d="M 22 58 Q 8 45 5 55 Q 8 65 22 58" fill="#000" opacity="0.1"/>
  <path d="M 38 84 L 36 91 L 40 91 Z" fill="#FF4500"/>
  <path d="M 62 84 L 60 91 L 64 91 Z" fill="#FF4500"/>
  <path d="M 38 84 L 36 91 L 40 91 Z" fill="#000" opacity="0.15"/>
  <path d="M 62 84 L 60 91 L 64 91 Z" fill="#000" opacity="0.15"/>
</svg>`
  },
  {
    id: "bear",
    name: "Bear",
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bearGrad" cx="50%" cy="40%">
      <stop offset="0%" stop-color="#A0522D"/>
      <stop offset="100%" stop-color="#8B4513"/>
    </radialGradient>
  </defs>
  <circle cx="50" cy="50" r="42" fill="url(#bearGrad)"/>
  <ellipse cx="50" cy="45" rx="35" ry="38" fill="#A0522D" opacity="0.3"/>
  <circle cx="28" cy="28" r="16" fill="#8B4513"/>
  <circle cx="72" cy="28" r="16" fill="#8B4513"/>
  <circle cx="28" cy="28" r="10" fill="#654321" opacity="0.5"/>
  <circle cx="72" cy="28" r="10" fill="#654321" opacity="0.5"/>
  <circle cx="38" cy="48" r="7.5" fill="#000"/>
  <circle cx="62" cy="48" r="7.5" fill="#000"/>
  <ellipse cx="40" cy="46" rx="3" ry="4" fill="#FFF"/>
  <ellipse cx="60" cy="46" rx="3" ry="4" fill="#FFF"/>
  <circle cx="40.5" cy="46" r="1.5" fill="#000"/>
  <circle cx="60.5" cy="46" r="1.5" fill="#000"/>
  <ellipse cx="50" cy="60" rx="6.5" ry="5.5" fill="#000"/>
  <ellipse cx="50" cy="60" rx="4" ry="3" fill="#4A4A4A"/>
  <path d="M 50 65 Q 44 72 38 70" stroke="#000" stroke-width="2.8" fill="none" stroke-linecap="round"/>
  <path d="M 50 65 Q 56 72 62 70" stroke="#000" stroke-width="2.8" fill="none" stroke-linecap="round"/>
  <ellipse cx="45" cy="70" rx="2" ry="1.5" fill="#654321" opacity="0.3"/>
  <ellipse cx="55" cy="70" rx="2" ry="1.5" fill="#654321" opacity="0.3"/>
</svg>`
  },
  {
    id: "fox",
    name: "Fox",
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="foxGrad" cx="50%" cy="40%">
      <stop offset="0%" stop-color="#FFA500"/>
      <stop offset="100%" stop-color="#FF8C00"/>
    </radialGradient>
  </defs>
  <circle cx="50" cy="52" r="40" fill="url(#foxGrad)"/>
  <ellipse cx="50" cy="48" rx="32" ry="35" fill="#FFA500" opacity="0.4"/>
  <path d="M 20 20 L 30 10 L 35 20 Z" fill="#FF8C00"/>
  <path d="M 80 20 L 70 10 L 65 20 Z" fill="#FF8C00"/>
  <path d="M 20 20 L 30 10 L 35 20 Z" fill="#000" opacity="0.1"/>
  <path d="M 80 20 L 70 10 L 65 20 Z" fill="#000" opacity="0.1"/>
  <ellipse cx="42" cy="50" rx="8.5" ry="10" fill="#000"/>
  <ellipse cx="58" cy="50" rx="8.5" ry="10" fill="#000"/>
  <ellipse cx="44" cy="48" rx="3" ry="4" fill="#FFF"/>
  <ellipse cx="56" cy="48" rx="3" ry="4" fill="#FFF"/>
  <circle cx="44.5" cy="48" r="1.5" fill="#000"/>
  <circle cx="56.5" cy="48" r="1.5" fill="#000"/>
  <ellipse cx="50" cy="62" rx="5.5" ry="4.5" fill="#000"/>
  <ellipse cx="50" cy="62" rx="3.5" ry="3" fill="#4A4A4A"/>
  <path d="M 50 65 Q 44 72 38 70" stroke="#000" stroke-width="2.8" fill="none" stroke-linecap="round"/>
  <path d="M 50 65 Q 56 72 62 70" stroke="#000" stroke-width="2.8" fill="none" stroke-linecap="round"/>
  <ellipse cx="45" cy="70" rx="2" ry="1.5" fill="#FF8C00" opacity="0.2"/>
  <ellipse cx="55" cy="70" rx="2" ry="1.5" fill="#FF8C00" opacity="0.2"/>
</svg>`
  },
  {
    id: "rabbit",
    name: "Rabbit",
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="rabbitGrad" cx="50%" cy="50%">
      <stop offset="0%" stop-color="#FFFEF0"/>
      <stop offset="100%" stop-color="#F5F5DC"/>
    </radialGradient>
  </defs>
  <ellipse cx="50" cy="58" rx="38" ry="40" fill="url(#rabbitGrad)"/>
  <ellipse cx="50" cy="55" rx="32" ry="35" fill="#FFFEF0" opacity="0.5"/>
  <ellipse cx="22" cy="12" rx="8" ry="22" fill="#F5F5DC" transform="rotate(-20 22 12)"/>
  <ellipse cx="78" cy="12" rx="8" ry="22" fill="#F5F5DC" transform="rotate(20 78 12)"/>
  <ellipse cx="22" cy="12" rx="4" ry="16" fill="#FFE4E1" transform="rotate(-20 22 12)"/>
  <ellipse cx="78" cy="12" rx="4" ry="16" fill="#FFE4E1" transform="rotate(20 78 12)"/>
  <ellipse cx="22" cy="12" rx="2" ry="10" fill="#FFF" opacity="0.6" transform="rotate(-20 22 12)"/>
  <ellipse cx="78" cy="12" rx="2" ry="10" fill="#FFF" opacity="0.6" transform="rotate(20 78 12)"/>
  <circle cx="42" cy="52" r="5.5" fill="#000"/>
  <circle cx="58" cy="52" r="5.5" fill="#000"/>
  <ellipse cx="44" cy="50" rx="2" ry="3" fill="#FFF"/>
  <ellipse cx="56" cy="50" rx="2" ry="3" fill="#FFF"/>
  <circle cx="44.5" cy="50" r="1" fill="#000"/>
  <circle cx="56.5" cy="50" r="1" fill="#000"/>
  <ellipse cx="50" cy="62" rx="3.5" ry="2.5" fill="#FF1493"/>
  <ellipse cx="50" cy="62" rx="2.5" ry="1.8" fill="#FF69B4"/>
  <path d="M 50 64 Q 47 72 43 70" stroke="#000" stroke-width="2.8" fill="none" stroke-linecap="round"/>
  <path d="M 50 64 Q 53 72 57 70" stroke="#000" stroke-width="2.8" fill="none" stroke-linecap="round"/>
  <path d="M 43 70 Q 50 73 57 70" stroke="#000" stroke-width="2.8" fill="none" stroke-linecap="round"/>
  <ellipse cx="48" cy="72" rx="1.5" ry="1" fill="#000" opacity="0.2"/>
  <ellipse cx="52" cy="72" rx="1.5" ry="1" fill="#000" opacity="0.2"/>
</svg>`
  },
  {
    id: "owl",
    name: "Owl",
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="owlGrad" cx="50%" cy="40%">
      <stop offset="0%" stop-color="#9D8565"/>
      <stop offset="100%" stop-color="#8B7355"/>
    </radialGradient>
  </defs>
  <ellipse cx="50" cy="60" rx="40" ry="38" fill="url(#owlGrad)"/>
  <circle cx="50" cy="32" r="34" fill="url(#owlGrad)"/>
  <ellipse cx="50" cy="30" rx="28" ry="30" fill="#9D8565" opacity="0.3"/>
  <path d="M 28 18 L 32 8 L 36 18 Z" fill="#8B7355"/>
  <path d="M 72 18 L 68 8 L 64 18 Z" fill="#8B7355"/>
  <path d="M 28 18 L 32 8 L 36 18 Z" fill="#000" opacity="0.15"/>
  <path d="M 72 18 L 68 8 L 64 18 Z" fill="#000" opacity="0.15"/>
  <circle cx="42" cy="40" r="12" fill="#000"/>
  <circle cx="58" cy="40" r="12" fill="#000"/>
  <circle cx="42" cy="40" r="9" fill="#1A1A1A"/>
  <circle cx="58" cy="40" r="9" fill="#1A1A1A"/>
  <circle cx="45" cy="38" r="5.5" fill="#FFF"/>
  <circle cx="55" cy="38" r="5.5" fill="#FFF"/>
  <circle cx="46" cy="37" r="2.5" fill="#000"/>
  <circle cx="54" cy="37" r="2.5" fill="#000"/>
  <circle cx="46.5" cy="36.5" r="1" fill="#FFF"/>
  <circle cx="54.5" cy="36.5" r="1" fill="#FFF"/>
  <path d="M 50 49 L 43 57 L 57 57 Z" fill="#FF8C00"/>
  <path d="M 50 49 L 43 57 L 57 57 Z" fill="#000" opacity="0.1"/>
  <ellipse cx="50" cy="65" rx="8" ry="4" fill="#654321" opacity="0.3"/>
</svg>`
  },
  {
    id: "panda",
    name: "Panda",
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="pandaGrad" cx="50%" cy="50%">
      <stop offset="0%" stop-color="#FFF"/>
      <stop offset="100%" stop-color="#F5F5F5"/>
    </radialGradient>
  </defs>
  <circle cx="50" cy="50" r="42" fill="url(#pandaGrad)"/>
  <ellipse cx="50" cy="45" rx="35" ry="38" fill="#FFF" opacity="0.5"/>
  <circle cx="28" cy="28" r="14" fill="#000"/>
  <circle cx="72" cy="28" r="14" fill="#000"/>
  <circle cx="28" cy="28" r="9" fill="#1A1A1A"/>
  <circle cx="72" cy="28" r="9" fill="#1A1A1A"/>
  <ellipse cx="38" cy="44" rx="12" ry="14" fill="#000"/>
  <ellipse cx="62" cy="44" rx="12" ry="14" fill="#000"/>
  <circle cx="41" cy="42" r="5.5" fill="#000"/>
  <circle cx="59" cy="42" r="5.5" fill="#000"/>
  <ellipse cx="42" cy="40" rx="3" ry="4" fill="#FFF"/>
  <ellipse cx="58" cy="40" rx="3" ry="4" fill="#FFF"/>
  <circle cx="42.5" cy="39.5" r="1.5" fill="#000"/>
  <circle cx="58.5" cy="39.5" r="1.5" fill="#000"/>
  <ellipse cx="50" cy="57" rx="6.5" ry="5.5" fill="#000"/>
  <ellipse cx="50" cy="57" rx="4" ry="3.5" fill="#1A1A1A"/>
  <path d="M 50 62 Q 44 71 36 69" stroke="#000" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  <path d="M 50 62 Q 56 71 64 69" stroke="#000" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  <ellipse cx="45" cy="70" rx="2" ry="1.5" fill="#000" opacity="0.2"/>
  <ellipse cx="55" cy="70" rx="2" ry="1.5" fill="#000" opacity="0.2"/>
</svg>`
  },
  {
    id: "tiger",
    name: "Tiger",
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="tigerGrad" cx="50%" cy="40%">
      <stop offset="0%" stop-color="#FFA500"/>
      <stop offset="100%" stop-color="#FF8C00"/>
    </radialGradient>
  </defs>
  <circle cx="50" cy="50" r="42" fill="url(#tigerGrad)"/>
  <ellipse cx="50" cy="45" rx="35" ry="38" fill="#FFA500" opacity="0.4"/>
  <path d="M 28 22 Q 22 32 28 42" stroke="#000" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  <path d="M 72 22 Q 78 32 72 42" stroke="#000" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  <path d="M 22 50 Q 18 60 22 70" stroke="#000" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  <path d="M 78 50 Q 82 60 78 70" stroke="#000" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  <path d="M 20 20 L 30 12 L 35 22 Z" fill="#FF8C00"/>
  <path d="M 80 20 L 70 12 L 65 22 Z" fill="#FF8C00"/>
  <path d="M 20 20 L 30 12 L 35 22 Z" fill="#000" opacity="0.1"/>
  <path d="M 80 20 L 70 12 L 65 22 Z" fill="#000" opacity="0.1"/>
  <ellipse cx="38" cy="48" rx="8.5" ry="10" fill="#000"/>
  <ellipse cx="62" cy="48" rx="8.5" ry="10" fill="#000"/>
  <ellipse cx="40" cy="46" rx="3" ry="4" fill="#FFF"/>
  <ellipse cx="60" cy="46" rx="3" ry="4" fill="#FFF"/>
  <circle cx="40.5" cy="46" r="1.5" fill="#000"/>
  <circle cx="60.5" cy="46" r="1.5" fill="#000"/>
  <ellipse cx="50" cy="60" rx="5.5" ry="4.5" fill="#000"/>
  <ellipse cx="50" cy="60" rx="3.5" ry="3" fill="#1A1A1A"/>
  <path d="M 50 63 Q 41 72 33 70" stroke="#000" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  <path d="M 50 63 Q 59 72 67 70" stroke="#000" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  <ellipse cx="45" cy="70" rx="2" ry="1.5" fill="#000" opacity="0.2"/>
  <ellipse cx="55" cy="70" rx="2" ry="1.5" fill="#000" opacity="0.2"/>
</svg>`
  },
  {
    id: "elephant",
    name: "Elephant",
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="elephantGrad" cx="50%" cy="50%">
      <stop offset="0%" stop-color="#D3D3D3"/>
      <stop offset="100%" stop-color="#C0C0C0"/>
    </radialGradient>
  </defs>
  <ellipse cx="50" cy="58" rx="40" ry="38" fill="url(#elephantGrad)"/>
  <ellipse cx="50" cy="55" rx="35" ry="33" fill="#D3D3D3" opacity="0.4"/>
  <path d="M 50 72 Q 48 82 42 88 Q 36 90 30 88" fill="#C0C0C0" stroke="#A0A0A0" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M 50 72 Q 48 82 42 88 Q 36 90 30 88" fill="#000" opacity="0.05"/>
  <ellipse cx="32" cy="86" rx="3.5" ry="2.5" fill="#A0A0A0"/>
  <ellipse cx="22" cy="38" rx="20" ry="28" fill="#C0C0C0" transform="rotate(-30 22 38)"/>
  <ellipse cx="78" cy="38" rx="20" ry="28" fill="#C0C0C0" transform="rotate(30 78 38)"/>
  <ellipse cx="22" cy="38" rx="14" ry="20" fill="#B0B0B0" transform="rotate(-30 22 38)"/>
  <ellipse cx="78" cy="38" rx="14" ry="20" fill="#B0B0B0" transform="rotate(30 78 38)"/>
  <circle cx="42" cy="52" r="5.5" fill="#000"/>
  <circle cx="58" cy="52" r="5.5" fill="#000"/>
  <ellipse cx="44" cy="50" rx="2" ry="3" fill="#FFF"/>
  <ellipse cx="56" cy="50" rx="2" ry="3" fill="#FFF"/>
  <circle cx="44.5" cy="50" r="1" fill="#000"/>
  <circle cx="56.5" cy="50" r="1" fill="#000"/>
  <path d="M 50 66 Q 47 72 43 70" stroke="#000" stroke-width="2.8" fill="none" stroke-linecap="round"/>
  <path d="M 50 66 Q 53 72 57 70" stroke="#000" stroke-width="2.8" fill="none" stroke-linecap="round"/>
  <ellipse cx="48" cy="72" rx="1.5" ry="1" fill="#000" opacity="0.2"/>
  <ellipse cx="52" cy="72" rx="1.5" ry="1" fill="#000" opacity="0.2"/>
</svg>`
  },
  {
    id: "lion",
    name: "Lion",
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="lionGrad" cx="50%" cy="50%">
      <stop offset="0%" stop-color="#FFD700"/>
      <stop offset="100%" stop-color="#FF8C00"/>
    </radialGradient>
    <radialGradient id="lionManeGrad" cx="50%" cy="50%">
      <stop offset="0%" stop-color="#FFA500"/>
      <stop offset="100%" stop-color="#FF8C00"/>
    </radialGradient>
  </defs>
  <circle cx="50" cy="50" r="44" fill="url(#lionManeGrad)"/>
  <circle cx="50" cy="50" r="34" fill="url(#lionGrad)"/>
  <ellipse cx="50" cy="48" rx="28" ry="30" fill="#FFD700" opacity="0.4"/>
  <ellipse cx="40" cy="50" rx="8.5" ry="10" fill="#000"/>
  <ellipse cx="60" cy="50" rx="8.5" ry="10" fill="#000"/>
  <ellipse cx="42" cy="48" rx="3" ry="4" fill="#FFF"/>
  <ellipse cx="58" cy="48" rx="3" ry="4" fill="#FFF"/>
  <circle cx="42.5" cy="48" r="1.5" fill="#000"/>
  <circle cx="58.5" cy="48" r="1.5" fill="#000"/>
  <ellipse cx="50" cy="60" rx="5.5" ry="4.5" fill="#000"/>
  <ellipse cx="50" cy="60" rx="3.5" ry="3" fill="#1A1A1A"/>
  <path d="M 50 63 Q 41 72 33 70" stroke="#000" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  <path d="M 50 63 Q 59 72 67 70" stroke="#000" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  <ellipse cx="45" cy="70" rx="2" ry="1.5" fill="#000" opacity="0.2"/>
  <ellipse cx="55" cy="70" rx="2" ry="1.5" fill="#000" opacity="0.2"/>
</svg>`
  },
  {
    id: "penguin",
    name: "Penguin",
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="penguinGrad" cx="50%" cy="50%">
      <stop offset="0%" stop-color="#1A1A1A"/>
      <stop offset="100%" stop-color="#000"/>
    </radialGradient>
  </defs>
  <ellipse cx="50" cy="60" rx="34" ry="40" fill="url(#penguinGrad)"/>
  <ellipse cx="50" cy="60" rx="26" ry="34" fill="#FFF"/>
  <ellipse cx="50" cy="58" rx="22" ry="30" fill="#F5F5F5" opacity="0.3"/>
  <circle cx="50" cy="30" r="30" fill="url(#penguinGrad)"/>
  <ellipse cx="50" cy="28" rx="24" ry="26" fill="#1A1A1A" opacity="0.4"/>
  <circle cx="42" cy="28" r="6.5" fill="#000"/>
  <circle cx="58" cy="28" r="6.5" fill="#000"/>
  <ellipse cx="44" cy="26" rx="3" ry="4" fill="#FFF"/>
  <ellipse cx="56" cy="26" rx="3" ry="4" fill="#FFF"/>
  <circle cx="44.5" cy="25.5" r="1.5" fill="#000"/>
  <circle cx="56.5" cy="25.5" r="1.5" fill="#000"/>
  <path d="M 50 39 L 43 47 L 57 47 Z" fill="#FF8C00"/>
  <path d="M 50 39 L 43 47 L 57 47 Z" fill="#000" opacity="0.1"/>
  <ellipse cx="28" cy="62" rx="10" ry="22" fill="#000" transform="rotate(-20 28 62)"/>
  <ellipse cx="72" cy="62" rx="10" ry="22" fill="#000" transform="rotate(20 72 62)"/>
  <ellipse cx="28" cy="62" rx="7" ry="18" fill="#1A1A1A" transform="rotate(-20 28 62)"/>
  <ellipse cx="72" cy="62" rx="7" ry="18" fill="#1A1A1A" transform="rotate(20 72 62)"/>
  <ellipse cx="40" cy="90" rx="11" ry="6" fill="#FF8C00"/>
  <ellipse cx="60" cy="90" rx="11" ry="6" fill="#FF8C00"/>
  <ellipse cx="40" cy="90" rx="8" ry="4" fill="#FFA500"/>
  <ellipse cx="60" cy="90" rx="8" ry="4" fill="#FFA500"/>
</svg>`
  }
];

export function getAvatarById(id) {
  return avatars.find((avatar) => avatar.id === id);
}
