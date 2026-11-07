import React, { useState, useMemo, useEffect } from 'react';
import levelsData from '../data/levels.json';
import phrasesData from '../data/phrases.json';

const LevelComponent = () => {
    const [selectedLevel, setSelectedLevel] = useState(null);
    const [progress, setProgress] = useState(() => {
        const saved = localStorage.getItem('levelProgress');
        return saved ? JSON.parse(saved) : {};
    });

    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [playState, setPlayState] = useState('select');

    const phrasesMap = useMemo(() => {
        const map = {};
        phrasesData.phrases.forEach(p => { map[p.id] = p; });
        return map;
    }, []);

    useEffect(() => {
        localStorage.setItem('levelProgress', JSON.stringify(progress));
    }, [progress]);

    const isUnlocked = (levelId) => {
        if (levelId === 1) return true;
        const prevLevel = levelsData.levels.find(l => l.id === levelId - 1);
        if (!prevLevel) return true;
        const prevProgress = progress[prevLevel.id];
        return prevProgress && prevProgress.bestScore >= prevLevel.requiredScore;
    };

    const startLevel = (level) => {
        const levelPhrases = level.phraseIds
            .map(id => phrasesMap[id])
            .filter(Boolean);

        const allPhrases = phrasesData.phrases.filter(p => p.ko);
        const newQuestions = levelPhrases.map(correctPhrase => {
            const others = allPhrases.filter(p => p.ko !== correctPhrase.ko);
            const shuffledOthers = [...others].sort(() => 0.5 - Math.random());
            const dummys = shuffledOthers.slice(0, 3);
            const options = [correctPhrase, ...dummys].sort(() => 0.5 - Math.random());
            return { correct: correctPhrase, options };
        });

        setQuestions(newQuestions);
        setCurrentIndex(0);
        setScore(0);
        setSelectedOption(null);
        setSelectedLevel(level);
        setPlayState('playing');
        playAudio(newQuestions[0].correct);
    };

    const playAudio = (phrase) => {
        if (!phrase) return;
        if (phrase.audioPath) {
            const audio = new Audio(phrase.audioPath);
            audio.play().catch(() => fallbackToWebSpeech(phrase.ko));
        } else {
            fallbackToWebSpeech(phrase.ko);
        }
    };

    const fallbackToWebSpeech = (text) => {
        if (!text || !('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        const uttr = new SpeechSynthesisUtterance(text.replace(/[!?]/g, ''));
        uttr.lang = 'ko-KR';
        const voices = window.speechSynthesis.getVoices();
        const koreanVoice = voices.find(v =>
            v.lang.startsWith('ko') ||
            v.name.toLowerCase().includes('korean') ||
            v.name.toLowerCase().includes('yuna')
        );
        if (koreanVoice) uttr.voice = koreanVoice;
        uttr.rate = 0.9;
        window.speechSynthesis.speak(uttr);
    };

    const handleOptionClick = (option) => {
        if (playState === 'answered') return;
        setSelectedOption(option);
        setPlayState('answered');
        if (option.ko === questions[currentIndex].correct.ko) {
            setScore(prev => prev + 1);
        }
    };

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setSelectedOption(null);
            setPlayState('playing');
            playAudio(questions[currentIndex + 1].correct);
        } else {
            const totalQuestions = questions.length;
            const percentage = Math.round((score / totalQuestions) * 100);
            const prevBest = progress[selectedLevel.id]?.bestScore || 0;
            if (percentage > prevBest) {
                setProgress(prev => ({
                    ...prev,
                    [selectedLevel.id]: {
                        bestScore: percentage,
                        stars: percentage >= 100 ? 3 : percentage >= 80 ? 2 : percentage >= 60 ? 1 : 0,
                        completedAt: new Date().toISOString()
                    }
                }));
            }
            setPlayState('result');
        }
    };

    const backToSelect = () => {
        setPlayState('select');
        setSelectedLevel(null);
    };

    // ======== レベル選択画面 ========
    if (playState === 'select') {
        // 現在のセクションとユニットを決定
        const totalCleared = Object.values(progress).filter(p => p.bestScore >= 80).length;
        const currentSection = Math.floor(totalCleared / 5) + 1;
        const currentUnit = (totalCleared % 5) + 1;

        return (
            <div className="level-container">
                {/* Duolingo-style pink section header */}
                <div className="section-header">
                    <div className="section-header-text">
                        <h3>セクション {currentSection} · ユニット {currentUnit}</h3>
                        <h2>🇰🇷 韓国語フレーズマスター</h2>
                    </div>
                    <span className="section-header-icon">📋</span>
                </div>

                <div className="level-path">
                    {levelsData.levels.map((level) => {
                        const unlocked = isUnlocked(level.id);
                        const levelProgress = progress[level.id];
                        const stars = levelProgress?.stars || 0;
                        const bestScore = levelProgress?.bestScore;

                        return (
                            <div
                                key={level.id}
                                className={`level-node ${unlocked ? 'unlocked' : 'locked'} ${stars >= 2 ? 'cleared' : ''}`}
                                onClick={() => unlocked && startLevel(level)}
                            >
                                <div className="level-icon">{unlocked ? level.icon : '🔒'}</div>
                                <div className="level-info">
                                    <h3>{level.name}</h3>
                                    <p>{level.description}</p>
                                    {bestScore !== undefined && (
                                        <div className="level-stars">
                                            <span className="best-score">ベスト: {bestScore}%</span>
                                            <span className="stars-display">
                                                {'⭐'.repeat(stars)}{'☆'.repeat(3 - stars)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // ======== 結果画面 ========
    if (playState === 'result') {
        const totalQuestions = questions.length;
        const percentage = Math.round((score / totalQuestions) * 100);
        const passed = percentage >= selectedLevel.requiredScore;
        const stars = percentage >= 100 ? 3 : percentage >= 80 ? 2 : percentage >= 60 ? 1 : 0;

        return (
            <div className="quiz-container result-screen">
                <h2>{passed ? '🎉 すばらしい！' : '💪 もう少し！'}</h2>
                <div className="result-percentage">{percentage}%</div>
                <div className="result-stars">{'⭐'.repeat(stars)}{'☆'.repeat(3 - stars)}</div>
                <div className="score-display">
                    <span className="score-number">{score}</span> / {totalQuestions} 問正解
                </div>
                <p className="result-message">
                    {passed
                        ? (percentage === 100 ? "パーフェクト！完璧です！" : "クリア！次のレベルが解放されました！")
                        : "惜しい！80%以上でクリアです。もう一度挑戦しましょう！"
                    }
                </p>
                <div className="result-actions">
                    <button className="start-btn" onClick={() => startLevel(selectedLevel)}>もう一度挑戦</button>
                    <button className="start-btn back-btn" onClick={backToSelect}>レベル選択に戻る</button>
                </div>
            </div>
        );
    }

    // ======== プレイ画面 ========
    const currentQuestion = questions[currentIndex];
    const isCorrect = selectedOption?.ko === currentQuestion?.correct.ko;

    return (
        <div className="quiz-container">
            {/* Exercise Header */}
            <div className="exercise-header">
                <button className="close-btn" onClick={backToSelect}>✕</button>
                <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${((currentIndex) / questions.length) * 100}%` }}></div>
                </div>
                <div className="hearts-display">
                    <span>❤️</span>
                    <span>{10 - (currentIndex - score)}</span>
                </div>
            </div>

            <div style={{ padding: '0 0.5rem' }}>
                <p className="quiz-instruction">聞こえたとおりにタップしてください</p>

                {/* Character + Audio */}
                <div className="character-area">
                    <div className="character-img">🐻</div>
                    <div className="speech-bubble">
                        <div className="audio-controls">
                            <button className="audio-btn" onClick={() => playAudio(currentQuestion.correct)}>
                                🔊
                            </button>
                            <button className="audio-btn slow" onClick={() => {
                                if (!currentQuestion.correct) return;
                                const text = currentQuestion.correct.ko.replace(/[!?]/g, '');
                                window.speechSynthesis.cancel();
                                const uttr = new SpeechSynthesisUtterance(text);
                                uttr.lang = 'ko-KR';
                                uttr.rate = 0.5;
                                const voices = window.speechSynthesis.getVoices();
                                const kv = voices.find(v => v.lang.startsWith('ko'));
                                if (kv) uttr.voice = kv;
                                window.speechSynthesis.speak(uttr);
                            }}>
                                🐢
                            </button>
                        </div>
                    </div>
                </div>

                {/* Options */}
                <div className="options-grid">
                    {currentQuestion.options.map((option, idx) => {
                        let className = "option-btn";
                        if (playState === 'answered') {
                            if (option.ko === currentQuestion.correct.ko) {
                                className += " correct";
                            } else if (option.ko === selectedOption?.ko) {
                                className += " wrong";
                            }
                        }
                        return (
                            <button key={idx} className={className} onClick={() => handleOptionClick(option)} disabled={playState === 'answered'}>
                                {option.ja}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Feedback Banner */}
            {playState === 'answered' && (
                <div className={`feedback-banner ${isCorrect ? 'correct' : 'wrong'}`}>
                    <div className="feedback-banner-content">
                        <div className="feedback-text">
                            <h3>{isCorrect ? '正解！🎉' : '不正解'}</h3>
                            <p>{currentQuestion.correct.ko} ({currentQuestion.correct.kana})</p>
                        </div>
                        <button className="feedback-next-btn" onClick={handleNext}>
                            {currentIndex < questions.length - 1 ? "次へ" : "結果を見る"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LevelComponent;
