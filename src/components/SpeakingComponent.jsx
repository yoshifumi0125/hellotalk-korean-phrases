import React, { useState, useEffect } from 'react';
import phrasesData from '../data/phrases.json';
import levelsData from '../data/levels.json';

const SpeakingComponent = () => {
    const [speakingMode, setSpeakingMode] = useState(null); // 'phrase' | 'word'
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isRecording, setIsRecording] = useState(false);
    const [userScript, setUserScript] = useState('');
    const [feedback, setFeedback] = useState(null);
    const [recognitionSupported, setRecognitionSupported] = useState(true);
    const [score, setScore] = useState(0);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    useEffect(() => {
        if (!SpeechRecognition) {
            setRecognitionSupported(false);
        }
    }, [SpeechRecognition]);

    const startPhraseMode = () => {
        const shuffled = [...phrasesData.phrases].sort(() => 0.5 - Math.random());
        setQuestions(shuffled.slice(0, 10));
        setSpeakingMode('phrase');
        setCurrentIndex(0);
        setScore(0);
        setUserScript('');
        setFeedback(null);
    };

    const startWordMode = () => {
        const shuffled = [...levelsData.wordQuiz].sort(() => 0.5 - Math.random());
        setQuestions(shuffled.slice(0, 10));
        setSpeakingMode('word');
        setCurrentIndex(0);
        setScore(0);
        setUserScript('');
        setFeedback(null);
    };

    if (!recognitionSupported) {
        return (
            <div className="quiz-container start-screen">
                <h2>🗣️ スピーキングモード</h2>
                <p>お使いのブラウザは音声認識機能をサポートしていません。</p>
                <p>Google Chrome または 最新のSafariをご利用ください。</p>
            </div>
        );
    }

    const normalizeString = (str) => {
        return str.replace(/[!?.,\s]/g, '').trim();
    };

    const playAudio = (audioPath) => {
        if (!audioPath) return;
        const audio = new Audio(audioPath);
        audio.play().catch(e => console.error("Audio play error", e));
    };

    const startRecording = () => {
        if (!SpeechRecognition) return;

        const recognition = new SpeechRecognition();
        recognition.lang = 'ko-KR';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            setIsRecording(true);
            setUserScript('');
            setFeedback(null);
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setUserScript(transcript);

            const currentItem = questions[currentIndex];
            const target = normalizeString(currentItem.ko);
            const spoken = normalizeString(transcript);

            if (spoken === target || spoken.includes(target) || target.includes(spoken)) {
                setFeedback('correct');
                setScore(prev => prev + 1);
            } else {
                setFeedback('wrong');
            }
        };

        recognition.onerror = (event) => {
            console.error("Speech recognition error", event.error);
            setIsRecording(false);
            if (event.error === 'not-allowed') {
                alert("マイクの使用が許可されていません。ブラウザの設定でマイクへのアクセスを許可してください。");
            }
        };

        recognition.onend = () => {
            setIsRecording(false);
        };

        recognition.start();
    };

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setUserScript('');
            setFeedback(null);
        } else {
            // 結果画面を表示するため speakingMode を 'result' に
            setSpeakingMode('result');
        }
    };

    // ======== モード選択画面 ========
    if (speakingMode === null) {
        return (
            <div className="quiz-container start-screen">
                <h2>🗣️ スピーキング練習</h2>
                <p>マイクに向かって韓国語を発音してみましょう！</p>
                <div className="word-quiz-modes">
                    <button className="start-btn" onClick={startPhraseMode}>
                        💬 フレーズの発音練習
                    </button>
                    <button className="start-btn reverse-btn" onClick={startWordMode}>
                        📝 単語の読み練習
                    </button>
                </div>
            </div>
        );
    }

    // ======== 結果画面 ========
    if (speakingMode === 'result') {
        const percentage = Math.round((score / 10) * 100);
        return (
            <div className="quiz-container result-screen">
                <h2>スピーキング結果</h2>
                <div className="score-display">
                    <span className="score-number">{score}</span> / 10
                </div>
                <p className="result-message">
                    {score === 10 ? "パーフェクト！🎉" : score >= 8 ? "素晴らしい発音です！✨" : score >= 5 ? "いい調子です！👍" : "もっと練習しましょう！💪"}
                </p>
                <div className="word-quiz-modes">
                    <button className="start-btn" onClick={startPhraseMode}>💬 フレーズをもう一度</button>
                    <button className="start-btn reverse-btn" onClick={startWordMode}>📝 単語をもう一度</button>
                    <button className="start-btn back-btn" onClick={() => setSpeakingMode(null)}>モード選択に戻る</button>
                </div>
            </div>
        );
    }

    // ======== プレイ画面 ========
    if (questions.length === 0) {
        return <div className="quiz-container">読み込み中...</div>;
    }

    const currentItem = questions[currentIndex];
    const isWordMode = speakingMode === 'word';

    return (
        <div className="quiz-container speaking-container">
            <div className="quiz-header">
                <span className="question-count">
                    {isWordMode ? '📝' : '💬'} {currentIndex + 1} / 10
                </span>
                <span className="current-score">正解: {score}</span>
            </div>

            {/* プログレスバー */}
            <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${(currentIndex / 10) * 100}%` }}></div>
            </div>

            <div className="phrase-display">
                <h2 className="speaking-korean">{currentItem.ko}</h2>
                <p className="speaking-kana">{currentItem.kana}</p>
                <p className="speaking-ja">{currentItem.ja}</p>
                {!isWordMode && currentItem.audioPath && (
                    <button
                        className="replay-btn small-margin"
                        onClick={() => playAudio(currentItem.audioPath)}
                    >
                        🔊 お手本を聞く
                    </button>
                )}
            </div>

            <div className="recording-area">
                <button
                    className={`mic-btn ${isRecording ? 'recording' : ''}`}
                    onClick={startRecording}
                    disabled={isRecording}
                >
                    {isRecording ? "🎙️ 聞き取り中..." : "🎤 タップして発音する"}
                </button>
            </div>

            {userScript && (
                <div className={`feedback-area ${feedback}`}>
                    <p className="user-spoken-label">あなたの発音：</p>
                    <p className="user-spoken-text">{userScript}</p>
                    <div className="feedback-result">
                        {feedback === 'correct' ? (
                            <h3 className="correct-text">🎉 通じます！</h3>
                        ) : (
                            <h3 className="wrong-text">惜しい！もう一度！</h3>
                        )}
                    </div>
                </div>
            )}

            {feedback && (
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                    {feedback === 'wrong' && (
                        <button className="next-btn back-btn" style={{ flex: 1 }} onClick={startRecording}>
                            🔄 もう一度
                        </button>
                    )}
                    <button className="next-btn speaking-next" style={{ flex: 1 }} onClick={handleNext}>
                        {currentIndex < questions.length - 1 ? "次へ ➔" : "結果を見る ➔"}
                    </button>
                </div>
            )}
        </div>
    );
};

export default SpeakingComponent;
