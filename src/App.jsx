import React, { useState, useMemo, useEffect } from 'react';
import CategorySection from './components/CategorySection';
import QuizComponent from './components/QuizComponent';
import phrasesData from './data/phrases.json';
import './index.css';

function App() {
  const [mode, setMode] = useState('list'); // 'list' | 'quiz'

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
    // 初回ロード時に音声を読み込んでおく（Safari/Chromeの仕様対応）
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  const handlePlayAudio = (phrase, rate = 1.0) => {
    if (!phrase) return;

    // Use the pre-generated high quality MP3 file if available
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
      // 韓国語音声がない場合はアラートで通知（変な声で再生されるのを防ぐ）
      alert("ネイティブ音声の取得に失敗しました。\n\nお使いの端末に韓国語의音声データ가ありません。\nMac의경우：設定 ＞ アクセシビリティ ＞ 読み上げコンテンツ 에서「Yuna (韓国語)」를追加해주세요.");
    }
  };

  const scrollToCategory = (categoryName) => {
    const id = categoryName.replace(/\s+/g, '-');
    const element = document.getElementById(id);
    if (element) {
      // offset for sticky header
      const headerOffset = 140;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  return (
    <div className="app-container">
      <div className="background-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>

      <header className="glass-header">
        <div className="header-content">
          <h1>
            <span className="gradient-text">HelloTalk</span>
            <span className="subtitle">Korean Phrases</span>
          </h1>
          <p>ネイティブとの会話で使えるフレーズ練習帳</p>

          <div className="mode-tabs">
            <button
              className={`mode-tab ${mode === 'list' ? 'active' : ''}`}
              onClick={() => setMode('list')}
            >
              📖 一覧モード
            </button>
            <button
              className={`mode-tab ${mode === 'quiz' ? 'active' : ''}`}
              onClick={() => setMode('quiz')}
            >
              🎧 クイズモード
            </button>
          </div>
        </div>

        {/* Navigation Menu only visible in list mode */}
        {mode === 'list' && (
          <nav className="category-nav">
            {categoryNames.map(cat => (
              <button
                key={cat}
                className="nav-btn"
                onClick={() => scrollToCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </nav>
        )}
      </header>

      <main className="main-content">
        {mode === 'list' ? (
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
        ) : (
          <QuizComponent />
        )}
      </main>

      <footer className="glass-footer">
        <p>韓国語学習を応援しています！ 화이팅!</p>
      </footer>
    </div>
  );
}

export default App;
