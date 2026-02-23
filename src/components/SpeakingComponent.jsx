import React, { useState, useEffect, useRef, useCallback } from 'react';
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
    const [autoListening, setAutoListening] = useState(false);
    const recognitionRef = useRef(null);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    useEffect(() => {
        if (!SpeechRecognition) {
            setRecognitionSupported(false);
        }
    }, [SpeechRecognition]);

    const normalizeString = (str) => {
        return str.replace(/[!?.,\s]/g, '').trim();
    };

    // 連続で音声認識を開始する関数
    const startListening = useCallback(() => {
        if (!SpeechRecognition || !questions.length) return;

        const recognition = new SpeechRecognition();
        recognition.lang = 'ko-KR';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognitionRef.current = recognition;

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
                // 正解なら1.5秒後に自動で次へ
                setTimeout(() => {
                    if (currentIndex < questions.length - 1) {
                        setCurrentIndex(prev => prev + 1);
                        setUserScript('');
                        setFeedback(null);
                    } else {
                        setSpeakingMode('result');
                    }
                }, 1200);
            } else {
                setFeedback('wrong');
                // 不正解でも2秒後に自動で再度リスニング開始
                setTimeout(() => {
                    setUserScript('');
                    setFeedback(null);
                }, 1500);
            }
        };

        recognition.onerror = (event) => {
            console.error("Speech recognition error", event.error);
            setIsRecording(false);
            if (event.error === 'not-allowed') {
                alert("マイクの使用が許可されていません。ブラウザの設定でマイクへのアクセスを許可してください。");
                setAutoListening(false);
            }
        };

        recognition.onend = () => {
            setIsRecording(false);
        };

        recognition.start();
    }, [SpeechRecognition, questions, currentIndex]);

    // autoListeningがONの場合、feedback解消後に自動でリスニング開始
    useEffect(() => {
        if (autoListening && !isRecording && !feedback && speakingMode && speakingMode !== 'result' && questions.length > 0) {
            const timer = setTimeout(() => {
                startListening();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [autoListening, isRecording, feedback, speakingMode, questions, startListening]);

    const startPhraseMode = () => {
        const shuffled = [...phrasesData.phrases].sort(() => 0.5 - Math.random());
        setQuestions(shuffled.slice(0, 10));
        setSpeakingMode('phrase');
        setCurrentIndex(0);
        setScore(0);
        setUserScript('');
        setFeedback(null);
        setAutoListening(true);
    };

    const startWordMode = () => {
        const shuffled = [...levelsData.wordQuiz].sort(() => 0.5 - Math.random());
        setQuestions(shuffled.slice(0, 10));
        setSpeakingMode('word');
        setCurrentIndex(0);
        setScore(0);
        setUserScript('');
        setFeedback(null);
        setAutoListening(true);
    };

    const playAudio = (audioPath) => {
        if (!audioPath) return;
        const audio = new Audio(audioPath);
        audio.play().catch(e => console.error("Audio play error", e));
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

    // ======== モード選択画面 ========
    if (speakingMode === null) {
        return (
            <div className="quiz-container start-screen">
                <h2>🗣️ スピーキング練習</h2>
                <p>マイクに向かって韓国語を発音！<br />自動で聞き取って判定します。</p>
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
        return (
            <div className="quiz-container result-screen">
                <h2>スピーキング結果</h2>
                <div className="score-display">
                    <span className="score-number">{score}</span> / 10
                </div>
                <p className="result-message">
                    {score === 10 ? "パーフェクト！🎉" : score >= 8 ? "素晴らしい発音！✨" : score >= 5 ? "いい調子！👍" : "もっと練習！💪"}
                </p>
                <div className="word-quiz-modes">
                    <button className="start-btn" onClick={startPhraseMode}>💬 フレーズ</button>
                    <button className="start-btn reverse-btn" onClick={startWordMode}>📝 単語</button>
                    <button className="start-btn back-btn" onClick={() => { setSpeakingMode(null); setAutoListening(false); }}>戻る</button>
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

            <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${(currentIndex / 10) * 100}%` }}></div>
            </div>

            {/* ハングルのみ表示（振り仮名なし） */}
            <div className="phrase-display">
                <h2 className="speaking-korean">{currentItem.ko}</h2>
                {!isWordMode && currentItem.audioPath && (
                    <button
                        className="replay-btn small-margin"
                        onClick={() => playAudio(currentItem.audioPath)}
                    >
                        🔊 お手本
                    </button>
                )}
            </div>

            {/* マイク状態表示 */}
            <div className="recording-area">
                <div className={`mic-status ${isRecording ? 'recording' : ''}`}>
                    {isRecording ? "🎙️ 聞き取り中..." : feedback ? "⏳ 次の問題へ..." : "🎤 話してください"}
                </div>
            </div>

            {userScript && (
                <div className={`feedback-area ${feedback}`}>
                    <p className="user-spoken-text">{userScript}</p>
                    <div className="feedback-result">
                        {feedback === 'correct' ? (
                            <h3 className="correct-text">🎉 正解！</h3>
                        ) : (
                            <h3 className="wrong-text">❌ もう一度！</h3>
                        )}
                    </div>
                </div>
            )}

            {/* 手動停止ボタン */}
            <button className="start-btn back-btn" style={{ marginTop: 'auto' }} onClick={() => { setSpeakingMode(null); setAutoListening(false); if (recognitionRef.current) recognitionRef.current.abort(); }}>
                ✕ やめる
            </button>
        </div>
    );
};

export default SpeakingComponent;
