import React, { useState, useEffect, useRef, useCallback } from 'react';
import phrasesData from '../data/phrases.json';
import levelsData from '../data/levels.json';

const SpeakingComponent = () => {
    const [speakingMode, setSpeakingMode] = useState(null); // 'phrase' | 'word' | 'ja_to_ko'
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isRecording, setIsRecording] = useState(false);
    const [userScript, setUserScript] = useState('');
    const [feedback, setFeedback] = useState(null);
    const [recognitionSupported, setRecognitionSupported] = useState(true);
    const [score, setScore] = useState(0);
    const [autoListening, setAutoListening] = useState(false);
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);
    const [interimText, setInterimText] = useState(''); // リアルタイム表示用
    const recognitionRef = useRef(null);
    const autoListenTimerRef = useRef(null);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    useEffect(() => {
        if (!SpeechRecognition) {
            setRecognitionSupported(false);
        }
        return () => {
            if (recognitionRef.current) {
                try { recognitionRef.current.abort(); } catch (e) { }
            }
            if (autoListenTimerRef.current) {
                clearTimeout(autoListenTimerRef.current);
            }
        };
    }, [SpeechRecognition]);

    const normalizeString = (str) => {
        return str.replace(/[!?.,\s]/g, '').trim();
    };

    const getSimilarity = (a, b) => {
        if (a === b) return 1;
        if (!a.length || !b.length) return 0;
        const matrix = [];
        for (let i = 0; i <= b.length; i++) matrix[i] = [i];
        for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b[i - 1] === a[j - 1]) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        const maxLen = Math.max(a.length, b.length);
        return 1 - matrix[b.length][a.length] / maxLen;
    };

    // 音声認識を停止する
    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            try { recognitionRef.current.abort(); } catch (e) { }
            recognitionRef.current = null;
        }
        if (autoListenTimerRef.current) {
            clearTimeout(autoListenTimerRef.current);
            autoListenTimerRef.current = null;
        }
    }, []);

    // 音声認識を開始する
    const startListening = useCallback(() => {
        if (!SpeechRecognition || !questions.length || isPlayingAudio) return;

        stopListening();

        const recognition = new SpeechRecognition();
        recognition.lang = 'ko-KR';
        recognition.interimResults = true;  // リアルタイム表示を有効に
        recognition.continuous = true;      // 長文対応：自動で止まらない
        recognition.maxAlternatives = 1;
        recognitionRef.current = recognition;

        recognition.onstart = () => {
            setIsRecording(true);
            setInterimText('');
        };

        recognition.onresult = (event) => {
            let finalTranscript = '';
            let interim = '';

            for (let i = 0; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    finalTranscript += result[0].transcript;
                } else {
                    interim += result[0].transcript;
                }
            }

            // リアルタイム表示（中間結果 + 確定結果）
            const displayText = finalTranscript || interim;
            setInterimText(displayText);

            // 確定結果がある場合のみ判定
            if (finalTranscript) {
                // 認識を停止
                try { recognition.stop(); } catch (e) { }

                setUserScript(finalTranscript);
                setInterimText('');

                const currentItem = questions[currentIndex];
                const target = normalizeString(currentItem.ko);
                const spoken = normalizeString(finalTranscript);

                const similarity = getSimilarity(spoken, target);
                const isWord = speakingMode === 'word';
                const threshold = isWord ? 0.8 : 0.7;
                const lengthRatio = spoken.length / target.length;

                if (similarity >= threshold && lengthRatio >= 0.5) {
                    setFeedback('correct');
                    setScore(prev => prev + 1);
                    autoListenTimerRef.current = setTimeout(() => {
                        if (currentIndex < questions.length - 1) {
                            setCurrentIndex(prev => prev + 1);
                            setUserScript('');
                            setFeedback(null);
                        } else {
                            setSpeakingMode('result');
                            setAutoListening(false);
                        }
                    }, 2000);
                } else {
                    setFeedback('wrong');
                    autoListenTimerRef.current = setTimeout(() => {
                        setUserScript('');
                        setFeedback(null);
                    }, 1800);
                }
            }
        };

        recognition.onerror = (event) => {
            console.error("Speech recognition error", event.error);
            setIsRecording(false);
            setInterimText('');
            if (event.error === 'not-allowed') {
                alert("マイクの使用が許可されていません。ブラウザの設定でマイクへのアクセスを許可してください。");
                setAutoListening(false);
            }
        };

        recognition.onend = () => {
            setIsRecording(false);
            setInterimText('');
        };

        try {
            recognition.start();
        } catch (e) {
            console.error("Recognition start error", e);
        }
    }, [SpeechRecognition, questions, currentIndex, isPlayingAudio, speakingMode, stopListening]);

    // 自動リスニング
    useEffect(() => {
        if (autoListening && !isRecording && !feedback && !isPlayingAudio &&
            speakingMode && speakingMode !== 'result' && questions.length > 0) {
            autoListenTimerRef.current = setTimeout(() => {
                startListening();
            }, 600);
            return () => {
                if (autoListenTimerRef.current) {
                    clearTimeout(autoListenTimerRef.current);
                }
            };
        }
    }, [autoListening, isRecording, feedback, isPlayingAudio, speakingMode, questions, startListening]);

    // お手本音声を再生（再生中は認識を一時停止、終了後に再開）
    const playAudio = (audioPath) => {
        if (!audioPath) return;
        // 現在の認識を停止
        stopListening();
        setIsPlayingAudio(true);
        setIsRecording(false);

        const audio = new Audio(audioPath);
        audio.onended = () => {
            setIsPlayingAudio(false);
            // 再生終了後、自動リスニングを再開させる
        };
        audio.onerror = () => {
            setIsPlayingAudio(false);
        };
        audio.play().catch(e => {
            console.error("Audio play error", e);
            setIsPlayingAudio(false);
        });
    };

    const initMode = (mode, data) => {
        const shuffled = [...data].sort(() => 0.5 - Math.random());
        setQuestions(shuffled.slice(0, 10));
        setSpeakingMode(mode);
        setCurrentIndex(0);
        setScore(0);
        setUserScript('');
        setFeedback(null);
        setIsPlayingAudio(false);
        setAutoListening(true);
    };

    const startPhraseMode = () => initMode('phrase', phrasesData.phrases);
    const startWordMode = () => initMode('word', levelsData.wordQuiz);
    const startJaToKoMode = () => initMode('ja_to_ko', phrasesData.phrases);

    const goBack = () => {
        stopListening();
        setSpeakingMode(null);
        setAutoListening(false);
        setIsPlayingAudio(false);
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
                    <button className="start-btn ja-to-ko-btn" onClick={startJaToKoMode}>
                        🇯🇵→🇰🇷 日本語を見て韓国語で話す
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
                    <button className="start-btn ja-to-ko-btn" onClick={startJaToKoMode}>🇯🇵→🇰🇷 日韓</button>
                    <button className="start-btn back-btn" onClick={goBack}>戻る</button>
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
    const isJaToKoMode = speakingMode === 'ja_to_ko';

    return (
        <div className="quiz-container speaking-container">
            <div className="quiz-header">
                <span className="question-count">
                    {isWordMode ? '📝' : isJaToKoMode ? '🇯🇵→🇰🇷' : '💬'} {currentIndex + 1} / 10
                </span>
                <span className="current-score">正解: {score}</span>
            </div>

            <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${(currentIndex / 10) * 100}%` }}></div>
            </div>

            <div className="phrase-display">
                {/* 日本語→韓国語モードの場合：日本語を表示 */}
                {isJaToKoMode ? (
                    <>
                        <h2 className="speaking-ja-prompt">{currentItem.ja}</h2>
                        {/* 録音中またはフィードバック表示中はハングルも表示 */}
                        {(isRecording || feedback) && (
                            <p className="speaking-hangul-hint">{currentItem.ko}</p>
                        )}
                    </>
                ) : (
                    /* 通常モード：ハングルのみ表示 */
                    <h2 className="speaking-korean">{currentItem.ko}</h2>
                )}

                {/* お手本ボタン（フレーズモードと日韓モードのみ。audioPathがある場合） */}
                {!isWordMode && currentItem.audioPath && (
                    <button
                        className="replay-btn small-margin"
                        onClick={() => playAudio(currentItem.audioPath)}
                        disabled={isPlayingAudio}
                    >
                        {isPlayingAudio ? "🔊 再生中..." : "🔊 お手本"}
                    </button>
                )}
            </div>

            {/* マイク状態表示 */}
            <div className="recording-area">
                <div className={`mic-status ${isRecording ? 'recording' : ''} ${isPlayingAudio ? 'paused' : ''}`}>
                    {isPlayingAudio ? "🔊 音声再生中..." : isRecording ? "🎙️ 聞き取り中..." : feedback ? "⏳ 次へ..." : "🎤 話してください"}
                </div>
            </div>

            {/* リアルタイム表示 */}
            {isRecording && interimText && !feedback && (
                <div className="interim-display">
                    <p className="interim-text">{interimText}</p>
                </div>
            )}

            {userScript && (
                <div className={`feedback-area ${feedback}`}>
                    <p className="user-spoken-text">{userScript}</p>
                    <div className="feedback-result">
                        {feedback === 'correct' ? (
                            <>
                                <h3 className="correct-text">🎉 正解！</h3>
                                <p className="feedback-ja">{currentItem.ja}</p>
                            </>
                        ) : (
                            <h3 className="wrong-text">❌ もう一度！</h3>
                        )}
                    </div>
                </div>
            )}

            <button className="start-btn back-btn" style={{ marginTop: 'auto' }} onClick={goBack}>
                ✕ やめる
            </button>
        </div>
    );
};

export default SpeakingComponent;
