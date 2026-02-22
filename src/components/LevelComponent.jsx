import React, { useState, useMemo, useEffect } from 'react';
import levelsData from '../data/levels.json';
import phrasesData from '../data/phrases.json';

const LevelComponent = () => {
    const [selectedLevel, setSelectedLevel] = useState(null);
    const [progress, setProgress] = useState(() => {
        const saved = localStorage.getItem('levelProgress');
        return saved ? JSON.parse(saved) : {};
    });

    // レベルプレイ用の状態
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [playState, setPlayState] = useState('select'); // 'select' | 'playing' | 'answered' | 'result'

    // フレーズIDから実際のフレーズを引く
    const phrasesMap = useMemo(() => {
        const map = {};
        phrasesData.phrases.forEach(p => { map[p.id] = p; });
        return map;
    }, []);

    // 進捗をlocalStorageに保存
    useEffect(() => {
        localStorage.setItem('levelProgress', JSON.stringify(progress));
    }, [progress]);

    // レベルがアンロックされているか判定する関数
    const isUnlocked = (levelId) => {
        if (levelId === 1) return true;
        const prevLevel = levelsData.levels.find(l => l.id === levelId - 1);
        if (!prevLevel) return true;
        const prevProgress = progress[prevLevel.id];
        return prevProgress && prevProgress.bestScore >= prevLevel.requiredScore;
    };

    // レベルを開始
    const startLevel = (level) => {
        const levelPhrases = level.phraseIds
            .map(id => phrasesMap[id])
            .filter(Boolean);

        // 4択クイズを作る
        const allPhrases = phrasesData.phrases.filter(p => p.audioPath);
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

        // 最初の音声を再生
        playAudio(newQuestions[0].correct.audioPath);
    };

    const playAudio = (audioPath) => {
        if (!audioPath) return;
        const audio = new Audio(audioPath);
        audio.play().catch(e => console.error("Audio play error", e));
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
            playAudio(questions[currentIndex + 1].correct.audioPath);
        } else {
            // 結果画面
            const totalQuestions = questions.length;
            const percentage = Math.round((score / totalQuestions) * 100);

            // 進捗保存
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
        return (
            <div className="level-container">
                <h2 className="level-title">🏆 レベル別トレーニング</h2>
                <p className="level-subtitle">80%以上のスコアで次のレベルが解放されます</p>

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
                <h2>{selectedLevel.name} - 結果</h2>
                <div className="score-display">
                    <span className="score-number">{score}</span> / {totalQuestions}
                </div>
                <p className="result-percentage">{percentage}%</p>
                <div className="result-stars">{'⭐'.repeat(stars)}{'☆'.repeat(3 - stars)}</div>
                <p className="result-message">
                    {passed
                        ? (percentage === 100 ? "パーフェクト！完璧です！🎉" : "クリア！次のレベルが解放されました！🎊")
                        : "惜しい！80%以上でクリアです。もう一度挑戦しましょう！💪"
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

    return (
        <div className="quiz-container">
            <div className="quiz-header">
                <span className="question-count">{selectedLevel?.icon} {currentIndex + 1} / {questions.length}</span>
                <span className="current-score">正解: {score}</span>
            </div>

            {/* プログレスバー */}
            <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${((currentIndex) / questions.length) * 100}%` }}></div>
            </div>

            <div className="audio-player-area">
                <button className="replay-btn" onClick={() => playAudio(currentQuestion.correct.audioPath)}>
                    🔊 音声をもう一度聞く
                </button>
            </div>

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

            {playState === 'answered' && (
                <div className="answer-feedback">
                    <div className="feedback-content">
                        <p className="korean-reveal">{currentQuestion.correct.ko}</p>
                        <p className="kana-reveal">{currentQuestion.correct.kana}</p>
                    </div>
                    <button className="next-btn" onClick={handleNext}>
                        {currentIndex < questions.length - 1 ? "次へ ➔" : "結果を見る ➔"}
                    </button>
                </div>
            )}
        </div>
    );
};

export default LevelComponent;
