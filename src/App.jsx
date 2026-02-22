import React, { useState, useMemo, useEffect } from 'react';
import CategorySection from './components/CategorySection';
import QuizComponent from './components/QuizComponent';
import SpeakingComponent from './components/SpeakingComponent';
import LevelComponent from './components/LevelComponent';
import WordQuizComponent from './components/WordQuizComponent';
import phrasesData from './data/phrases.json';
import './index.css';
import './App.css';

function App() {
  const [mode, setMode] = useState('level'); // デフォルトをレベルに

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const categories = useMemo(() => {
    const cats = {};
    phrasesData.phrases.forEach(p => {
      if (!cats[p.category]) cats[p.category] = [];
      cats[p.category].push(p);
    });
    return cats;
  }, []);

  const categoryNames = Object.keys(categories);

  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  const handlePlayAudio = (phrase, rate = 1.0) => {
    if (!phrase) return;
    if (phrase.audioPath) {
      const audio = new Audio(phrase.audioPath);
      audio.playbackRate = rate;
      audio.play().catch(error => {
        console.warn("Failed to play local audio, falling back to Web Speech API:", error);
        fallbackToWebSpeech(phrase.ko, rate);
      });
    } else {
      fallbackToWebSpeech(phrase.ko, rate);
    }
  };

  const fallbackToWebSpeech = (text, rate) => {
    const cleanText = text.trim();
    if (!cleanText || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const uttrText = cleanText.replace(/[!?]/g, '');
    const uttr = new SpeechSynthesisUtterance(uttrText);
    uttr.lang = 'ko-KR';
    const voices = window.speechSynthesis.getVoices();
    const koreanVoice = voices.find(v =>
      v.lang.startsWith('ko') ||
      v.name.toLowerCase().includes('korean') ||
      v.name.toLowerCase().includes('yuna')
    );
    if (koreanVoice) {
      uttr.voice = koreanVoice;
      uttr.rate = rate;
      window.speechSynthesis.speak(uttr);
    } else {
      alert("ネイティブ音声の取得に失敗しました。\n\nお使いの端末に韓国語の音声データがありません。\nMacの場合：設定 ＞ アクセシビリティ ＞ 読み上げコンテンツ から「Yuna (韓国語)」を追加してください。");
    }
  };

  const scrollToCategory = (categoryName) => {
    setIsMenuOpen(false);
    const id = categoryName.replace(/\s+/g, '-');
    const element = document.getElementById(id);
    if (element) {
      const headerOffset = 60;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
    }
  };

  return (
    <div className="app-container">
      <div className="background-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>

      {/* Compact top bar - only in list mode */}
      {mode === 'list' && (
        <header className="compact-header">
          <h1 className="compact-title">
            <span className="gradient-text">HelloTalk</span> Korean
          </h1>
          <div className="hamburger-menu-container">
            <button className="hamburger-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              <div className={`hamburger-icon ${isMenuOpen ? 'open' : ''}`}>
                <span></span><span></span><span></span>
              </div>
            </button>
            {isMenuOpen && (
              <nav className="dropdown-nav">
                {categoryNames.map(cat => (
                  <button key={cat} className="dropdown-btn" onClick={() => scrollToCategory(cat)}>
                    {cat}
                  </button>
                ))}
              </nav>
            )}
          </div>
        </header>
      )}

      <main className="main-content-full">
        {mode === 'list' && (
          <>
            {Object.entries(categories).map(([categoryName, phrases]) => (
              <CategorySection
                key={categoryName}
                title={categoryName}
                phrases={phrases}
                onPlay={handlePlayAudio}
              />
            ))}
          </>
        )}
        {mode === 'level' && <LevelComponent />}
        {mode === 'quiz' && <QuizComponent />}
        {mode === 'wordquiz' && <WordQuizComponent />}
        {mode === 'speaking' && <SpeakingComponent />}
      </main>

      {/* Bottom Tab Bar - Duolingo style */}
      <nav className="bottom-tab-bar">
        <button className={`tab-item ${mode === 'level' ? 'active' : ''}`} onClick={() => setMode('level')}>
          <span className="tab-icon">🏠</span>
          <span className="tab-label">ホーム</span>
        </button>
        <button className={`tab-item ${mode === 'quiz' ? 'active' : ''}`} onClick={() => setMode('quiz')}>
          <span className="tab-icon">🎧</span>
          <span className="tab-label">クイズ</span>
        </button>
        <button className={`tab-item ${mode === 'wordquiz' ? 'active' : ''}`} onClick={() => setMode('wordquiz')}>
          <span className="tab-icon">📝</span>
          <span className="tab-label">単語</span>
        </button>
        <button className={`tab-item ${mode === 'speaking' ? 'active' : ''}`} onClick={() => setMode('speaking')}>
          <span className="tab-icon">🗣️</span>
          <span className="tab-label">発音</span>
        </button>
        <button className={`tab-item ${mode === 'list' ? 'active' : ''}`} onClick={() => setMode('list')}>
          <span className="tab-icon">📖</span>
          <span className="tab-label">一覧</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
